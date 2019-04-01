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
const Prism = require('prismjs')
const prismPath = require.resolve('prismjs')
const prismStyleSheet = fs.readFileSync(path.join(prismPath.split('prism.js')[0], 'themes/prism.css'))

module.exports = function (app, callback) {
  const logger = require('./tools/logger')(app.get('params').logging)
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

  if (params.htmlValidator.enable) {
    validatorOptions.port = params.htmlValidator.port
    callValidator()
  } else {
    if (app.get('env') !== 'production') {
      logger.warn('HTML validator disabled. Continuing without HTML validation...'.yellow)
    }
    callback()
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
          logger.error('Another process that is not the HTMLValidator is using this port already. Quitting the initialization of your app')
          process.exit(1)
        }

        res.setEncoding('utf8')

        res.on('data', (chunk) => {
          rawData += chunk
        })

        res.on('end', () => {
          if (rawData.includes('Nu Html Checker')) {
            logger.log('✅', `Detached validator found on port: ${validatorOptions.port}`.green)
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
        logger.log('☕️', 'Starting HTML validator...'.yellow)

        validatorProcess.stderr.on('data', (data) => {
          if (`${data}`.includes('INFO:oejs.Server:main: Started')) {
            clearTimeout(validatorTimeout)
            if (params.htmlValidator.separateProcess.enable) {
              logger.log('🎧', `HTML validator listening on port: ${params.htmlValidator.port} (as a detached, background process)`.bold)
            } else {
              logger.log('🎧', `HTML validator listening on port: ${params.htmlValidator.port}`.bold)
            }
            applyValidatorMiddleware()
            resolve()
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
          if (data.includes('java version') || data.includes('openjdk version')) {
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
    let foundModelException = false

    app.response.render = function (view, model, callback) {
      if (!model) {
        model = {}
      }

      if (modelException) {
        modelException = [].concat(modelException)

        modelException.forEach(function (exception) {
          if (model[exception]) {
            foundModelException = true
          }
        })
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
      let errorMap = new Map()
      let formattedHTML
      let model = {}

      // utility function to parse html validation messages from JSON
      function parseValidatorMessage (data) {
        // first line is error message
        let validationMessage = `${data.message}\n`

        // determine format of line/column numbers before adding them to message
        if (data.firstLine) {
          validationMessage += `From line ${data.firstLine}, column ${data.firstColumn}; to line ${data.lastLine}, column ${data.lastColumn}`
          if (data.type === 'error') {
            errorMap.set(data.firstLine, data.message)
            errorMap.set(data.lastLine, data.message)
          }
        } else {
          validationMessage += `At line ${data.lastLine}, column ${data.lastColumn}`
          if (data.type === 'error') {
            errorMap.set(data.lastLine, data.message)
          }
        }

        // add a line break after the message
        validationMessage += '\n\n'

        return validationMessage
      }

      function validatorExceptions () {
        let found = false

        if (foundModelException) {
          found = true
        }

        headerException = [].concat(headerException)

        headerException.forEach(function (exception) {
          // check the request header
          if (req.headers[exception.toLowerCase()]) {
            found = true
          }

          // check the response header
          if (res.getHeader(exception.toLowerCase())) {
            found = true
          }
        })
        if (found) {
          return true
        } else {
          return false
        }
      }

      if (res.statusCode === 200 && res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html') && !validatorExceptions()) {
        return body =>
          new Promise(resolve => {
            options.data = body
            options.format = 'json'

            ;(async () => {
              try {
                const validationResult = await validator(options)
                let parsedErrors = ''
                let parsedWarnings = ''

                // parse html validation data
                validationResult.messages.forEach(item => {
                  if (item.type === 'error') {
                    detectErrors = true
                    parsedErrors += parseValidatorMessage(item)
                  } else {
                    warnings = true
                    parsedWarnings += parseValidatorMessage(item)
                  }
                })

                // setup error page if validation errors are discovered
                if (detectErrors) {
                  pageTitle = 'HTML did not pass validation'
                  pageHeader = 'HTML did not pass validator:'
                  errorList = `<h2>Errors:</h2>\n<pre class="validatorErrors">${parsedErrors}</pre>`
                  warningList = `<h2>Warnings:</h2>\n<pre class="validatorWarnings">${parsedWarnings}</pre>`

                  // empty warning list if warnings are disabled
                  if (!params.htmlValidator.showWarnings || !warnings) {
                    warningList = undefined
                  }
                }
              } catch (error) {
                logger.error(error)
                detectErrors = true
                pageTitle = 'Cannot connect to validator'
                pageHeader = 'Unable to connect to HTML validator'
              }

              if (detectErrors) {
                markup = body
                // Highlight and add line numbers to html
                formattedHTML = `<pre class='markup'>\n<code class="language-html">\n`
                markupArray = markup.split('\n')
                for (i = 0; i < markupArray.length; i++) {
                  markupLine = markupArray[i]
                  if (errorMap.has(i + 1)) {
                    formattedHTML += `<span title='${errorMap.get(i + 1)}' class='line-numbers error'>`
                    formattedHTML += Prism.highlight(`${markupLine}`, Prism.languages.markup)
                    formattedHTML += `</span>`
                  } else {
                    formattedHTML += `<span class='line-numbers'>`
                    formattedHTML += Prism.highlight(`${markupLine}`, Prism.languages.markup)
                    formattedHTML += `</span>`
                  }
                }
                formattedHTML += `</code>\n</pre>`
                // build markup template
                formattedHTML = `<h2>Markup used:</h2>\n${formattedHTML}`

                res.status(500)
                model.prismStyle = prismStyleSheet.toString()
                model.pageTitle = pageTitle
                model.preWidth = markupArray.length.toString().length * 8
                model.pageHeader = pageHeader
                model.errors = errorList
                model.warnings = warningList
                model.markup = formattedHTML
                body = template(validatorErrorPage, model)
              }

              resolve(body)
            })()
          })
      }
    }))
  }

  function autoKillerStart (cb) {
    // make sure that the html Validator is enabled, that it is on a separate process, and that the autoKiller is set to true
    if (params.htmlValidator.separateProcess.enable && params.htmlValidator.separateProcess.autoKiller) {
      let humanReadableTimeout = millisecondsToStr(params.htmlValidator.separateProcess.autoKillerTimeout)

      // see if a PID Text File exists
      let PIDPath = path.join(os.tmpdir(), 'roosevelt_validator_pid.txt')
      let test = fs.existsSync(PIDPath)
      if (test === true) {
        // if there is one, grab the PID number from the process.env and then kill it
        let contents = fs.readFileSync(PIDPath).toString('utf8')
        let PID = parseInt(contents)
        fkill(PID, { force: true }).then(() => {
          // if it finds a process and kills it, state that we are restarting autoKiller and fire autoKillValidator as a child process, also deletes the temp file
          logger.log('⏳', `Respawning a process to automatically kill the detached validator after ${humanReadableTimeout} of inactivity`)
          fs.unlinkSync(PIDPath)
          let autokiller = spawn('node', [`${path.join(__dirname, 'scripts/autoKillValidator.js')}`, `${params.port}`, `${params.htmlValidator.separateProcess.autoKillerTimeout}`, params.logging.verbose], { detached: true, stdio: 'inherit', shell: false, windowsHide: true })
          autokiller.unref()
          cb()
        }, () => {
          // if the process was closed alreadly, state that there was no process found and that roosevelt is creating a new autoKiller and fire autoKillValidator as a child process, also deletes the temp file
          logger.log('⏳', `Spawning a process to automatically kill the detached validator after ${humanReadableTimeout} of inactivity`)
          fs.unlinkSync(PIDPath)
          let autokiller = spawn('node', [`${path.join(__dirname, 'scripts/autoKillValidator.js')}`, `${params.port}`, `${params.htmlValidator.separateProcess.autoKillerTimeout}`, params.logging.verbose], { detached: true, stdio: 'inherit', shell: false, windowsHide: true })
          autokiller.unref()
          cb()
        })
      } else {
        // if a PID text file doesn't exist, state that there was no autoKiller running, that the app is creating a new autoKiller, and then fire autoKillValidator as a child process
        logger.log('⏳', `Spawning a process to automatically kill the detached validator after ${humanReadableTimeout} of inactivity`)
        let autokiller = spawn('node', [`${path.join(__dirname, 'scripts/autoKillValidator.js')}`, `${params.port}`, `${params.htmlValidator.separateProcess.autoKillerTimeout}`, params.logging.verbose], { detached: true, stdio: 'inherit', shell: false, windowsHide: true })
        autokiller.unref()
        cb()
      }
    } else {
      // if htmlValidator is either not enabled, or not on a separate process, fire the callback function given to it
      cb()
    }

    function millisecondsToStr (milliseconds) {
      function numberEnding (number) {
        return (number > 1) ? 's' : ''
      }

      let temp = Math.floor(milliseconds / 1000)
      let hours = Math.floor((temp %= 86400) / 3600)
      if (hours) {
        return hours + ' hour' + numberEnding(hours)
      }
      let minutes = Math.floor((temp %= 3600) / 60)
      if (minutes) {
        return minutes + ' minute' + numberEnding(minutes)
      }
      let seconds = temp % 60
      return seconds + ' second' + numberEnding(seconds)
    }
  }
}
