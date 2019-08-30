// middleware to handle forms with formidable

require('colors')

const fs = require('fs-extra')
const formidable = require('formidable')

module.exports = function (app) {
  const appName = app.get('appName')
  const logger = app.get('logger')

  app.set('formidable', formidable)

  app.use(function (req, res, next) {
    const contentType = req.headers['content-type']
    let form

    if (typeof contentType === 'string' && contentType.indexOf('multipart/form-data') > -1) {
      form = new formidable.IncomingForm(app.get('params').multipart)
      form.parse(req, function (err, fields, files) {
        if (err) {
          logger.error(`${appName} failed to parse multipart form at ${req.url}`)
          next(err)
          return
        }
        req.body = fields // pass along form fields
        req.files = files // pass along files

        // remove tmp files after request finishes
        const cleanup = function () {
          Object.keys(files).forEach(function (file) {
            const filePath = files[file].path
            if (typeof filePath === 'string') {
              fs.access(filePath, function (err) {
                if (!err) {
                  fs.unlink(filePath, function (err) {
                    if (err) {
                      logger.error(`${appName} failed to remove tmp file: ${filePath}\n`, err)
                    }
                  })
                }
              })
            }
          })
        }
        res.once('finish', cleanup)
        res.once('close', cleanup)
        next()
      })
    } else {
      next()
    }
  })

  return app
}
