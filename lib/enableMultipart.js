// handle file upload (multipart forms)
require('@colors/colors')
const fs = require('fs-extra')
const formidable = require('formidable')

module.exports = app => {
  const appName = app.get('appName')
  const logger = app.get('logger')
  const params = app.get('params').formidable

  // apply middleware for handling form data
  app.use((req, res, next) => {
    const contentType = req.headers['content-type']

    // only process forms with multipart content-type
    if (typeof contentType === 'string' && contentType.includes('multipart/form-data')) {
      // generate form object with formidable
      const form = new formidable.IncomingForm(params)

      form.parse(req, (err, fields, files) => {
        if (err) {
          logger.error(`${appName} failed to parse multipart form at ${req.url}`)
          next(err)
          return
        }
        req.body = fields // pass along form fields
        req.files = files // pass along files

        // remove tmp files left behind by formidable
        res.on('finish', cleanup)
        res.on('close', cleanup)

        function cleanup () {
          for (const fileArray of Object.values(files)) {
            for (const file of fileArray) {
              const filePath = file.filepath

              if (typeof filePath === 'string') {
                fs.remove(filePath, err => {
                  if (err) {
                    logger.error(`${appName} failed to remove tmp file: ${filePath}\n`, err)
                  }
                })
              }
            }
          }
        }

        next()
      })
    } else next()
  })
}
