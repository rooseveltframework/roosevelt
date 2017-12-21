// html validator

require('colors')

const validator = require('html-validator')
const tamper = require('tamper')
const spawn = require('child_process').spawn
const vnu = require('vnu-jar')
const http = require('http')

module.exports = function (app, callback) {
  const logger = require('./logger')(app)
  let params = app.get('params')
  let validatorProcess
  let validatorShutdown
  let headerException = params.validatorExceptions.requestHeader
  let modelException = params.validatorExceptions.modelValue
  let options
  let i
  let isError = false
  let calledKill = false
  let validatorTimeout
  let validatorOptions = {
    url: 'http://localhost',
    method: 'GET',
    headers: {
      'User-Agent': 'request'
    }
  }

  process.argv.forEach(function (val, index, array) {
    switch (val) {
      case 'detach-validator':
        params.htmlValidator.separateProcess = true
        break
      case 'attach-validator':
        params.htmlValidator.separateProcess = false
        break
    }
  })

  if (!params.enableValidator) {
    if (!app.get('env') !== 'production') {
      logger.warn('HTML validator disabled. Continuing without HTML validation...'.yellow)
    }
    callback()
  } else {
    params.htmlValidator.validator = 'http://localhost:' + params.htmlValidator.port
    validatorOptions.port = params.htmlValidator.port
    options = params.htmlValidator

    // only run validator if in dev mode
    if (process.env.NODE_ENV === 'development') {
      callValidator()
    }
  }

  function callValidator () {
    return new Promise((resolve, reject) => {
      isError = false

      // see if there's one already running
      http.get(validatorOptions, function (res) {
        const { statusCode } = res

        let error
        let rawData = ''
        if (statusCode !== 200) {
          error = new Error(`Request Failed.\nStatus Code: ${statusCode}`)
        }
        if (error) {
          // consume 404 response data
          logger.error(error.message)
          res.resume()
          return
        }

        res.setEncoding('utf8')

        res.on('data', (chunk) => {
          rawData += chunk
        })

        res.on('end', () => {
          try {
            if (rawData.includes('Nu Html Checker')) {
              logger.log('✔️', `Detached validator found on port: ${validatorOptions.port}`.bold.green)
              calledKill = true
              clearTimeout(validatorTimeout)
              logger.log('🎧', `HTML validator listening on port: ${params.htmlValidator.port}`.bold)
              applyValidatorMiddleware()
              resolve()
            } else {
              // spawn a new one
              spawnNewValidator()
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
        logger.log('⌛', 'Starting HTML validator...'.bold.yellow)

        validatorProcess.stderr.on('data', (data) => {
          if (`${data}`.includes('No Java runtime present, requesting install.')) {
            reject(new Error('There was an error in authentication. Please make sure to have Java installed.'))
          }
          if (`${data}`.includes('Address already in use')) {
            isError = true

            if (!params.htmlValidator.separateProcess && calledKill === false) {
              calledKill = true
              validatorShutdown = spawn('node', ['./node_modules/roosevelt/lib/killValidator.js'])
              logger.warn(`Port ${params.htmlValidator.port} already in use. Shutting down other process on port...`.bold.yellow)

              validatorShutdown.stderr.on('data', (data) => {
                if (`${data}`.includes('No PID found on port.')) {
                  reject(new Error('Unable to start validator. No PID found on specified port.'))
                }
              })

              validatorShutdown.on('error', (err) => {
                if (err) {
                  logger.error(`${err}`.red)
                }
              })

              validatorShutdown.on('exit', function () {
                // signal validator to restart
                resolve('Restart')
              })
            } else {
              if (calledKill === false) {
                calledKill = true
                logger.log('✔️', 'Validator already detached'.green)
                clearTimeout(validatorTimeout)
                logger.log('🎧', `HTML validator listening on port: ${params.htmlValidator.port}`.bold)
                applyValidatorMiddleware()
                resolve()
              }
            }
          }
          if (`${data}`.includes('INFO:oejs.Server:main: Started')) {
            setTimeout(function () {
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

        validatorTimeout = setTimeout(function () {
          reject(new Error('HTML validator has timed out.'))
        }, 30000)
      }
    }).then(result => {
      clearTimeout(validatorTimeout)
      if (!params.enableValidator && app.get('env') !== 'production') {
        logger.warn('HTML validator disabled. Continuing without HTML validation...'.yellow)
      }
      if (result === 'Restart') {
        logger.log('⌛', 'Restarting validator...'.bold.yellow)
        callValidator()
      } else {
        callback()
      }
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
      let detectErrors
      let errorList
      let warningList
      let errorArr
      let errorArrLength
      let errorLine
      let pageTitle
      let pageHeader
      let htmlArr
      let htmlArrLength
      let htmlLine
      let formattedHTML

      if (req.headers[headerException]) {
        res.set(headerException, true)
      }

      if (res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html') && !res.getHeader(headerException)) {
        return body =>
          new Promise((resolve) => {
            options.data = body
            console.log(options)

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
                errorList = ''
                warningList = ''
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
                    if (errorArr[i + 1].startsWith('From line') || errorArr[i + 1].startsWith('At line')) {
                      warningList += errorLine + '\n' + errorArr[i + 1] + '\n\n'
                    } else {
                      warningList += errorLine + '\n\n'
                    }
                  }
                }

                if (!options.suppressWarnings) {
                  warningList = undefined
                }

                // Add line numbers to html
                htmlArr = body.split('\n')
                htmlArrLength = htmlArr.length
                formattedHTML = ''
                for (i = 0; i < htmlArrLength; i++) {
                  htmlLine = htmlArr[i]
                  htmlLine = (i + 1) + '  ' + htmlLine + '\n'
                  formattedHTML += htmlLine
                }
              }

              if (detectErrors) {
                body = `
                  <!DOCTYPE html>
                  <html lang='en'>
                    <head>
                      <meta charset='utf-8'>
                      <meta name='viewport' content='width=device-width,initial-scale=1'>
                      <meta name='format-detection' content='telephone=no'>
                      <title>${pageTitle}</title>
                    </head>
                    <body>
                      <main>
                        <article>
                          <style>h1 {color: #000;} body {margin-left: 15px;} .validatorErrors {color: #f00;} .validatorWarnings {color: #ffa500;}</style>
                          <h1>${pageHeader}</h1>
                          ${errorList ? '<h2>Errors:</h2>' + '<pre class=\'validatorErrors\'>' + errorList + '</pre>' : ''}
                          ${warningList ? '<h2>Warnings:</h2>' + '<pre class=\'validatorWarnings\'>' + warningList + '</pre>' : ''}
                          ${errorList ? '<h2>Markup used:</h2>' + '<pre>\n' + formattedHTML.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&#34;').replace(/'/g, '&#39;') + '</pre>' : ''}
                        </article>
                      </main>
                    </body>
                  </html>
                `
              }
              resolve(body)
            })
          })
      }
    }))
  }
}
