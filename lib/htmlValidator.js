// html validator

require('colors')

const execa = require('execa')
const fkill = require('fkill')
const fs = require('fs-extra')
const os = require('os')
const path = require('path')
const pidFromPort = require('pid-from-port')
const ps = require('ps-node')
const Prism = require('prismjs')
const prismPath = require.resolve('prismjs')
const prismStyleSheet = fs.readFileSync(path.join(prismPath.split('prism.js')[0], 'themes/prism.css'))
const tamper = require('tamper')
const template = require('es6-template-strings')
const validator = require('html-validator')
const validatorErrorPage = fs.readFileSync(path.join(__dirname, '../defaultErrorPages/views/htmlValidator.html'))
const vnu = require('vnu-jar')

module.exports = function (app, callback) {
  const logger = app.get('logger')
  const params = app.get('params')

  // validator initialization chain
  ;(async () => {
    try {
      await checkJava()
      await checkIfPortInUse()
      await killStaleAutoScripts()
      await initValidator()
      await initAutoKiller()
      await applyValidatorMiddleware()

      callback()
    } catch (e) {
      logger.error(e)

      // continue execution for certain errors and kill process for others
      if (e.includes('because it has timed out') || e.includes('must install Java')) {
        callback()
      } else {
        process.exit(1)
      }
    }
  })()

  // first check that Java is installed and in path
  async function checkJava () {
    try {
      // java prints its version number in stderr for some reason
      const { stderr } = await execa('java', ['-version'])
      if (!stderr.includes('java version') && !stderr.includes('openjdk version')) {
        throw new Error()
      }
    } catch (e) {
      throw new Error('You must install Java to continue. HTML validation disabled, error on initialization (check to make sure Java is installed and in your path)')
    }
  }

  // then check if configured port is in use
  async function checkIfPortInUse () {
    try {
      // check if port is in use by a process
      const pid = await pidFromPort(params.htmlValidator.port)

      // determine what process is using the port
      pidLookup(pid)
    } catch {
      // this catch is hit when validator port is not in use
    }

    // determine validator instance by pid
    async function pidLookup (pid) {
      // lookup process on pid and determine if it's a validator
      ps.lookup({ pid: pid }, (err, list) => {
        if (!err && list[0]) {
          if (list[0].arguments.includes('nu.validator.servlet.Main')) {
            // tell the user it found a detached validator
            logger.info('✅', `Detached validator found on port ${params.htmlValidator.port}`.green)
          } else {
            // something else is using that port
            throw new Error('Another process that is not the HTMLValidator is using this port already. Quitting the initialization of your app')
          }
        }
      })
    }
  }

  // then scan for and kill any stale auto killer instances if found
  async function killStaleAutoScripts () {
    ps.lookup({
      command: 'node',
      arguments: 'autoKillValidator.js'
    }, async (err, processList) => {
      if (!err && processList[0]) {
        // kill any currently running auto killer processes
        processList.forEach(async autoKillProcess => {
          await fkill(Number(autoKillProcess.pid), { force: true })
          logger.info('🗑', 'Killed stale instance of validator auto killer process')
        })
      }
    })
  }

  // then start up the validator service
  async function initValidator () {
    logger.info('☕️', 'Starting HTML validator...'.yellow)

    return new Promise(resolve => {
      // spawn the html validator process
      const validatorProcess = execa('java', [
        '-Xss1024k',
        `-XX:ErrorFile=${path.join(os.tmpdir(), '/java_error%p.log')}`,
        '-cp',
        vnu,
        'nu.validator.servlet.Main',
        params.htmlValidator.port
      ], { detached: params.htmlValidator.separateProcess.enable })

      // kill the process if it takes longer than 30 seconds to execute
      const validatorTimeout = setTimeout(() => {
        validatorProcess.cancel()
        throw new Error('HTML validator has been disabled because it has timed out.')
      }, 30000)

      // handle the validator process
      validatorProcess.stdout.on('data', data => {
        if (data.includes('Checker service started')) {
          clearTimeout(validatorTimeout)
          if (params.htmlValidator.separateProcess.enable) {
            logger.info('🎧', `HTML validator listening on port ${params.htmlValidator.port} (as a detached, background process)`.bold)
          } else {
            logger.info('🎧', `HTML validator listening on port ${params.htmlValidator.port}`.bold)
          }

          resolve()
        }
      })
    })
  }

  // then start up the auto killer script if enabled
  async function initAutoKiller () {
    // check that the validator is detached and that the auto killer is enabled
    if (params.htmlValidator.separateProcess.enable && params.htmlValidator.separateProcess.autoKiller) {
      const humanReadableTimeout = millisecondsToStr(params.htmlValidator.separateProcess.autoKillerTimeout)
      // start the auto killer process
      logger.info('⏳', `Spawning a process to automatically kill the detached validator after ${humanReadableTimeout} of inactivity`)
      execa('node', [
        `${path.join(__dirname, 'scripts/autoKillValidator.js')}`,
        `${params.htmlValidator.separateProcess.autoKillerTimeout}`,
        params.logging.methods.verbose
      ], { detached: true, stdio: 'inherit', shell: false, windowsHide: true })
    }

    // convert milliseconds into human readable time string
    function millisecondsToStr (milliseconds) {
      function numberEnding (number) {
        return (number > 1) ? 's' : ''
      }

      let temp = Math.floor(milliseconds / 1000)
      const hours = Math.floor((temp %= 86400) / 3600)
      if (hours) {
        return hours + ' hour' + numberEnding(hours)
      }
      const minutes = Math.floor((temp %= 3600) / 60)
      if (minutes) {
        return minutes + ' minute' + numberEnding(minutes)
      }
      const seconds = temp % 60
      return seconds + ' second' + numberEnding(seconds)
    }
  }

  // then apply express middlware that will make use of the validator
  async function applyValidatorMiddleware () {
    const render = app.response.render
    let headerException = params.htmlValidator.exceptions.requestHeader
    let modelException = params.htmlValidator.exceptions.modelValue
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
      const options = {
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
      const errorMap = new Map()
      let formattedHTML
      const model = {}

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
        if (foundModelException) {
          return true
        }

        headerException = [].concat(headerException)

        for (const exception of headerException) {
          // check the request header
          if (req.headers[exception.toLowerCase()]) {
            res.set(exception.toLowerCase(), true)
            return true
          }

          // check the response header
          if (res.getHeader(exception.toLowerCase())) {
            return true
          }
        }
        return false
      }

      // for validator to run against the generated markup...
      // ...HTTP status must be 200 (don't validate error pages)
      // ...content-type must be text/html (don't validate non-HTML responses)
      // ...the page must not be on the whitelist of exceptions
      // ...the htmlValidator feature must be enabled (it has to be checked again because it might be disabled by the user at runtime)
      if (res.statusCode === 200 && res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html') && !validatorExceptions() && app.get('params').htmlValidator.enable) {
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
                formattedHTML = '<pre class=\'markup\'>\n<code class="language-html">\n'
                markupArray = markup.split('\n')
                for (let i = 0; i < markupArray.length; i++) {
                  markupLine = markupArray[i]
                  if (errorMap.has(i + 1)) {
                    formattedHTML += `<span title='${errorMap.get(i + 1)}' class='line-numbers error'>`
                    formattedHTML += Prism.highlight(`${markupLine}`, Prism.languages.markup)
                    formattedHTML += '</span>'
                  } else {
                    formattedHTML += '<span class=\'line-numbers\'>'
                    formattedHTML += Prism.highlight(`${markupLine}`, Prism.languages.markup)
                    formattedHTML += '</span>'
                  }
                }
                formattedHTML += '</code>\n</pre>'
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
                model.rawMarkup = markup
                body = template(validatorErrorPage, model)
              }

              resolve(body)
            })()
          })
      }
    }))
  }
}
