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
const os = require('os')
const fkill = require('fkill')

module.exports = function (app, callback) {
  const logger = require('./tools/logger')(app)
  let params = app.get('params')
  let validatorProcess
  let javaDetectProcess
  let headerException = params.htmlValidator.exceptions.requestHeader
  let modelException = params.htmlValidator.exceptions.modelValue
  let i
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
        })
      }).on('error', () => {
        // spawn a new one
        javaCheck(spawnNewValidator)
      })

      function spawnNewValidator () {
        validatorProcess = spawn(
          'java', ['-Xss1024k', '-cp', vnu, 'nu.validator.servlet.Main', params.htmlValidator.port], { detached: params.htmlValidator.separateProcess.enable }
        )
        logger.log('⌛', 'Starting HTML validator...'.yellow)

        validatorProcess.stderr.on('data', (data) => {
          if (`${data}`.includes('INFO:oejs.Server:main: Started')) {
            setTimeout(() => {
              clearTimeout(validatorTimeout)
              if (params.htmlValidator.separateProcess.enable) {
                logger.log('🎧', `HTML validator listening on port: ${params.htmlValidator.port} (as a detached, backgrounded process)`.bold)
              } else {
                logger.log('🎧', `HTML validator listening on port: ${params.htmlValidator.port}`.bold)
              }
              applyValidatorMiddleware()
              resolve()
            }, 5000)
          }
        })

        validatorTimeout = setTimeout(() => {
          validatorProcess.kill('SIGINT')
          params.htmlValidator.enable = false
          reject(new Error('HTML validator has been disabled because it has timed out.'))
        }, 30000)
      }

      function javaCheck (cb) {
        javaDetectProcess = spawn('java', ['-version'])

        javaDetectProcess.on('error', () => {
          reject(new Error('You must install Java to continue. HTML validation disabled, error on initialization (check to make sure Java is installed and in your path)'))
        })

        javaDetectProcess.stderr.on('data', (data) => {
          if (data.includes('java version')) {
            cb()
          }
        })
      }
    }).then(result => {
      clearTimeout(validatorTimeout)
      autoKillerStart(callback)
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
      let pageTitle
      let pageHeader
      let markup
      let markupArray
      let markupLine
      let formattedHTML
      let model = {}

      // utility function to parse html validation messages from JSON
      function parseValidatorMessage (data) {
        let validationMessage = ''
        // print message on first line
        validationMessage += `${data.message}\n`

        // determine format of line/column numbers before adding them to message
        if (data.firstLine) {
          validationMessage += `From line ${data.firstLine}, column ${data.firstColumn}; to line ${data.lastLine}, column ${data.lastColumn}`
        } else {
          validationMessage += `At line ${data.lastLine}, column ${data.lastColumn}`
        }

        // add a line break after the message
        validationMessage += '\n\n'

        return validationMessage
      }

      if (req.headers[headerException]) {
        res.set(headerException, true)
      }

      if (res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html') && !res.getHeader(headerException)) {
        return body =>
          new Promise((resolve) => {
            options.data = body
            options.format = 'json'

            validator(options, (error, htmlErrorData) => {
              if (error) {
                logger.error(error)
                detectErrors = true
                pageTitle = 'Cannot connect to validator'
                pageHeader = 'Unable to connect to HTML validator'
              } else {
                pageTitle = 'HTML did not pass validation'
                pageHeader = 'HTML did not pass validator:'
                errorList = '<h2>Errors:</h2>\n<pre class="validatorErrors">'
                warningList = '<h2>Warnings:</h2>\n<pre class="validatorWarnings">'

                // parse html validation data
                htmlErrorData.messages.forEach((item) => {
                  if (item.type === 'error') {
                    detectErrors = true
                    errorList += parseValidatorMessage(item)
                  } else {
                    warnings = true
                    warningList += parseValidatorMessage(item)
                  }
                })

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
                res.status(500)
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

  function autoKillerStart (cb) {
    // make sure that the html Validator is enabled, that it is on a separate process, and that the autoKiller is set to true
    if (params.htmlValidator.separateProcess.enable && params.htmlValidator.separateProcess.autoKiller) {
      // see if a PID Text File exists
      let PIDPath = path.join(os.tmpdir(), 'roosevelt_validator_pid.txt')
      let test = fs.existsSync(PIDPath)
      if (test === true) {
        // if there is one, grab the PID number from the process.env and then kill it
        let contents = fs.readFileSync(PIDPath).toString('utf8')
        let PID = parseInt(contents)
        fkill(PID, {force: true}).then(() => {
          // if it finds a process and kills it, state that we are restarting autoKiller and fire autoKillValidator as a child process, also deletes the temp file
          logger.log('Restarting autoKiller')
          fs.unlinkSync(PIDPath)
          let autokiller = spawn('node', [`${path.join(__dirname, 'scripts', 'autoKillValidator.js')}`, `${params.port}`, `${params.htmlValidator.separateProcess.autoKillerTimeout}`, params.suppressLogs.verboseLogs], {detached: true, stdio: 'inherit', shell: false, windowsHide: true})
          autokiller.unref()
          cb()
        }, () => {
          // if the process was closed alreadly, state that there was no process found and that roosevelt is creating a new autoKiller and fire autoKillValidator as a child process, also deletes the temp file
          logger.log('There was no autoKiller running with the PID given, creating a new one')
          fs.unlinkSync(PIDPath)
          let autokiller = spawn('node', [`${path.join(__dirname, 'scripts', 'autoKillValidator.js')}`, `${params.port}`, `${params.htmlValidator.separateProcess.autoKillerTimeout}`, params.suppressLogs.verboseLogs], {detached: true, stdio: 'inherit', shell: false, windowsHide: true})
          autokiller.unref()
          cb()
        })
      } else {
        // if a PID text file doesn't exist, state that there was no autoKiller running, that the app is creating a new autoKiller, and then fire autoKillValidator as a child process
        logger.log('There was no autoKiller running, creating a new one')
        let autokiller = spawn('node', [`${path.join(__dirname, 'scripts', 'autoKillValidator.js')}`, `${params.port}`, `${params.htmlValidator.separateProcess.autoKillerTimeout}`, params.suppressLogs.verboseLogs], {detached: true, stdio: 'inherit', shell: false, windowsHide: true})
        autokiller.unref()
        cb()
      }
    } else {
      // if htmlValidator is either not enabled, or not on a separate process, fire the callback function given to it
      cb()
    }
  }
}
