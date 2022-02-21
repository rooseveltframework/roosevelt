// middleware to handle forms with formidable

require('@colors/colors')

const fs = require('fs-extra')
const Formidable = require('formidable')

module.exports = app => {
  const appName = app.get('appName')
  const logger = app.get('logger')
  const params = app.get('params').formidable

  // store formidable module in express variable
  app.set('formidable', Formidable)

  // apply middleware for handling form data
  app.use((req, res, next) => {
    const contentType = req.headers['content-type']

    // only process forms with multipart content-type
    if (typeof contentType === 'string' && contentType.includes('multipart/form-data')) {
      // generate form object with formidable
      const form = new Formidable(params)

      form.parse(req, (err, fields, files) => {
        if (err) {
          logger.error(`${appName} failed to parse multipart form at ${req.url}`)
          next(err)
          return
        }
        req.body = fields // pass along form fields
        req.files = files // pass along files

        res.on('finish', cleanup)
        res.on('close', cleanup)

        /**
         * Remove tmp files left behind by formidable
         */
        function cleanup () {
          for (const key in files) {
            const file = files[key]
            const filePath = file.path

            if (typeof filePath === 'string') {
              fs.remove(filePath, err => {
                if (err) {
                  logger.error(`${appName} failed to remove tmp file: ${filePath}\n`, err)
                }
              })
            }
          }
        }
        next()
      })
    } else {
      next()
    }
  })

  return app
}
