// middleware to handle forms with formidable

require('colors')

const fs = require('fs')
const formidable = require('formidable')

module.exports = function (app) {
  const appName = app.get('appName')
  const logger = require('./tools/logger')(app)

  app.set('formidable', formidable)

  app.use(function (req, res, next) {
    const contentType = req.headers['content-type']
    let form

    if (typeof contentType === 'string' && contentType.indexOf('multipart/form-data') > -1) {
      form = new formidable.IncomingForm(app.get('params').multipart)
      form.parse(req, function (err, fields, files) {
        if (err) {
          logger.error(`${appName} failed to parse multipart form at ${req.url}`.red)
          next(err)
          return
        }
        req.body = fields // pass along form fields
        req.files = files // pass along files

        // remove tmp files after request finishes
        let cleanup = function () {
          Object.keys(files).forEach(function (file) {
            let filePath = files[file].path
            if (typeof filePath === 'string') {
              fs.access(filePath, function (err) {
                if (!err) {
                  fs.unlink(filePath, function (err) {
                    if (err) {
                      if (err.errno === 34 && err.code === 'ENOENT') {
                        // ignore file not found error
                      } else {
                        logger.error(`${appName} failed to remove tmp file: ${filePath}\n`.red, err)
                      }
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
