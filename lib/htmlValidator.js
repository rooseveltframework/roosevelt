// html validator

require('colors')

const validator = require('html-validator')
const tamper = require('tamper')
const spawn = require('child_process').spawn
const vnu = require('vnu-jar')
const http = require('http')
const fs = require('fs')
const path = require('path')
const template = require('es6-template-strings')
const validatorErrorPage = fs.readFileSync(path.join(__dirname, '../defaultErrorPages/views/htmlValidator.html'))

module.exports = function (app, callback) {
  const logger = require('./tools/logger')(app)
  let params = app.get('params')
  let validatorProcess
  let headerException = params.htmlValidator.exceptions.requestHeader
  let modelException = params.htmlValidator.exceptions.modelValue
  let i
  let isError = false
  let validatorTimeout
  let validatorOptions = {
    url: 'http://localhost',
    method: 'GET',
    headers: {
      'User-Agent': 'request'
    }
  }

  if (!params.htmlValidator.enable) {
    if (app.get('env') !== 'production') {
      logger.warn('HTML validator disabled. Continuing without HTML validation...'.yellow)
    }
    callback()
  } else {
    validatorOptions.port = params.htmlValidator.port
    callValidator()
  }

  function callValidator () {
    return new Promise((resolve, reject) => {
      isError = false

      // see if there's one already running
      http.get(validatorOptions, (res) => {
        const { statusCode } = res
        let error
        let rawData = ''
        if (statusCode !== 200) {
          error = new Error(`Request Failed.\nStatus Code: ${statusCode}`)
        }
        if (error) {
          // consume 404 response data
          logger.error(error.message)
          logger.error('Another process that is not the HTMLValidator is using this port already. Quiting the initialization of your app')
          process.exit(1)
        }

        res.setEncoding('utf8')

        res.on('data', (chunk) => {
          rawData += chunk
        })

        res.on('end', () => {
          try {
            if (rawData.includes('Nu Html Checker')) {
              logger.log('✔️', `Detached validator found on port: ${validatorOptions.port}`.green)
              clearTimeout(validatorTimeout)
              logger.log('🎧', `HTML validator listening on port: ${params.htmlValidator.port}`.bold)
              applyValidatorMiddleware()
              resolve()
            } else {
              // print out an error that another process is using the port
              logger.error('Another process that is not the HTMLValidator is using this port already. Quiting the initialization of your app')
              process.exit(1)
            }
          } catch (err) {
            // spawn a new one
            spawnNewValidator()
          }
        })
      }).on('error', () => {
        // spawn a new one
        spawnNewValidator()
      })

      function spawnNewValidator () {
        validatorProcess = spawn(
          'java', ['-Xss1024k', '-cp', vnu, 'nu.validator.servlet.Main', params.htmlValidator.port], { detached: params.htmlValidator.separateProcess }
        )
        logger.log('⌛', 'Starting HTML validator...'.yellow)

        validatorProcess.stderr.on('data', (data) => {
          if (`${data}`.includes('No Java runtime present, requesting install.')) {
            reject(new Error('There was an error in authentication. Please make sure to have Java installed.'))
          }
          if (`${data}`.includes('INFO:oejs.Server:main: Started')) {
            setTimeout(() => {
              if (isError === false) {
                clearTimeout(validatorTimeout)
                if (params.htmlValidator.separateProcess) {
                  logger.log('🎧', `HTML validator listening on port: ${params.htmlValidator.port} (as a detached, backgrounded process)`.bold)
                } else {
                  logger.log('🎧', `HTML validator listening on port: ${params.htmlValidator.port}`.bold)
                }
                applyValidatorMiddleware()
                resolve()
              }
            }, 5000)
          }
        })

        validatorProcess.stderr.on('error', (err) => {
          if (err.code === 'ENOENT') {
            reject(new Error('You must install Java to continue. HTML validation disabled, error on initialization (check to make sure Java is installed and in your path)'))
          } else {
            reject(err)
          }
        })

        validatorTimeout = setTimeout(() => {
          reject(new Error('HTML validator has timed out.'))
        }, 30000)
      }
    }).then(result => {
      clearTimeout(validatorTimeout)
      callback()
    }).catch(error => {
      clearTimeout(validatorTimeout)
      logger.error(`${error}`.red)
      callback()
    })
  }

  function applyValidatorMiddleware () {
    let render = app.response.render

    app.response.render = function (view, model, callback) {
      if (model[modelException]) {
        this.req.headers[headerException] = true
      }
      render.apply(this, arguments)
    }

    app.use(tamper((req, res) => {
      let options = {
        format: 'text',
        validator: `http://localhost:${params.htmlValidator.port}`
      }
      let detectErrors
      let errorList
      let warnings
      let warningList
      let errorArr
      let errorArrLength
      let errorLine
      let pageTitle
      let pageHeader
      let markup
      let markupArray
      let markupLine
      let formattedHTML
      let model = {}

      if (req.headers[headerException]) {
        res.set(headerException, true)
      }

      if (res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html') && !res.getHeader(headerException)) {
        return body =>
          new Promise((resolve) => {
            options.data = body

            validator(options, (error, htmlErrorData) => {
              if (error) {
                logger.error(error)
                detectErrors = true
                pageTitle = 'Cannot connect to validator'
                pageHeader = 'Unable to connect to HTML validator'
              } else if (htmlErrorData.indexOf('There were errors.') > -1) {
                detectErrors = true
                pageTitle = 'HTML did not pass validation'
                pageHeader = 'HTML did not pass validator:'

                // Add newline after errors and warnings
                errorList = '<h2>Errors:</h2>\n<pre class="validatorErrors">'
                warningList = '<h2>Warnings:</h2>\n<pre class="validatorWarnings">'
                errorArr = htmlErrorData.split('\n')
                errorArrLength = errorArr.length

                for (i = 0; i < errorArrLength; i++) {
                  errorLine = errorArr[i]
                  if (errorLine.startsWith('Error')) {
                    if (errorArr[i + 1].startsWith('From line') || errorArr[i + 1].startsWith('At line')) {
                      errorList += errorLine + '\n' + errorArr[i + 1] + '\n\n'
                    } else {
                      errorList += errorLine + '\n\n'
                    }
                  } else if (errorLine.startsWith('Warning')) {
                    warnings = true
                    if (errorArr[i + 1].startsWith('From line') || errorArr[i + 1].startsWith('At line')) {
                      warningList += errorLine + '\n' + errorArr[i + 1] + '\n\n'
                    } else {
                      warningList += errorLine + '\n\n'
                    }
                  }
                }

                errorList += '</pre>'
                warningList += '</pre>'

                if (params.htmlValidator.suppressWarnings || !warnings) {
                  warningList = undefined
                }
              }
              // escape HTML characters from markup to display
              markup = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&#34;').replace(/'/g, '&#39;')

              // Add line numbers to html
              formattedHTML = ''
              markupArray = markup.split('\n')
              for (i in markupArray) {
                markupLine = markupArray[i]
                formattedHTML += `<span>${markupLine}</span>`
              }

              // build markup template
              formattedHTML = `<h2>Markup used:</h2>\n<pre class="markup">${formattedHTML}</pre>`

              if (detectErrors) {
                model.pageTitle = pageTitle
                model.preWidth = markupArray.length.toString().length * 8
                model.pageHeader = pageHeader
                model.errors = errorList
                model.warnings = warningList
                model.markup = formattedHTML
                body = template(validatorErrorPage, model)
              }
              resolve(body)
            })
          })
      }
    }))
  }
}
