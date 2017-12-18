// html validator

require('colors')

const validator = require('html-validator')
const path = require('path')
const spawn = require('child_process').spawn
const vnu = require('vnu-jar')
const http = require('http')
let validatorOptions = {
  url: 'http://localhost',
  port: 8888,
  method: 'GET',
  headers: {
    'User-Agent': 'request'
  }
}

module.exports = function (app, callback) {
  const errorPage = path.join(__dirname, '/../defaultErrorPages/views/validatorErrors')
  const logger = require('./logger')(app)
  let params = app.get('params')
  let killValidatorTimer
  let validatorProcess
  let validatorShutdown
  let headerException = params.validatorExceptions.requestHeader
  let modelException = params.validatorExceptions.modelValue
  let options
  let i
  let errorArr
  let errorArrLength
  let errorLine
  let errorList
  let warningList
  let htmlArr
  let htmlArrLength
  let isError = false
  let calledKill = false
  let htmlLine
  let formattedHTML
  let validatorTimeout
  let validatorDisabled

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
    validatorDisabled = true
    if (!params.enableValidator && app.get('env') !== 'production') {
      logger.warn('HTML validator disabled. Continuing without HTML validation...'.yellow)
    }
    callback()
  } else {
    if (!params.htmlValidator) {
      options = {
        validator: 'http://localhost:8888',
        format: 'text'
      }
    } else {
      params.htmlValidator.validator = 'http://localhost:' + (params.htmlValidator.port ? params.htmlValidator.port : '8888')
      options = params.htmlValidator
    }

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
          error = new Error('Request Failed.\n' +
            `Status Code: ${statusCode}`)
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
          'java', ['-Xss1024k', '-cp', vnu, 'nu.validator.servlet.Main', params.htmlValidator.port ? params.htmlValidator.port : '8888'], { detached: params.htmlValidator.separateProcess }
        )
        if (params.htmlValidator.separateProcess === true) {
          spawnKillValidatorTimer()
        }
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
  function spawnKillValidatorTimer () {
    killValidatorTimer = spawn('node', ['./node_modules/roosevelt/lib/killValidatorTimer.js'])

    killValidatorTimer.stderr.on('data', (data) => {
      if (`${data}`.includes('TIMEOUT!')) {
        console.log('timeout complete')
      }
    })
  }

  function applyValidatorMiddleware () {
    app.use(function (req, res, next) {
      // get a reference to the original render
      let renderReference = res.render

      // override it
      res.render = function (view, model, fn) {
        let thisReference = this

        // get the html for this specific render
        app.render(view, model, function (err, html) {
          if (err) {
            logger.error(`${err}`.red)
          }
          if (!validatorDisabled && res.get(headerException) !== 'true' && !model[modelException] && html) {
            // run HTML validator and display errors on page
            options.data = html

            validator(options, function (error, htmlErrorData) {
              if (error) {
                logger.error(error)
                model.pageTitle = 'Cannot connect to validator'
                model.pageHeader = 'Unable to connect to HTML validator'
                renderReference.call(thisReference, errorPage, model, fn)
              } else if (htmlErrorData.indexOf('There were errors.') > -1) {
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

                model.htmlErrors = errorList

                if (!options.suppressWarnings) {
                  model.htmlWarnings = warningList === '' ? undefined : warningList
                }

                // Add line numbers to html
                htmlArr = html.split('\n')
                htmlArrLength = htmlArr.length
                formattedHTML = ''
                for (i = 0; i < htmlArrLength; i++) {
                  htmlLine = htmlArr[i]
                  htmlLine = (i + 1) + '  ' + htmlLine + '\n'
                  formattedHTML += htmlLine
                }

                model.markup = formattedHTML
                model.pageTitle = 'HTML did not pass validation'
                model.pageHeader = 'HTML did not pass validator:'
                renderReference.call(thisReference, errorPage, model, fn)
              } else {
                renderReference.call(thisReference, view, model, fn)
              }
            })
          } else {
            renderReference.call(thisReference, view, model, fn)
          }
        })
      }
      next()
    })
  }
}
