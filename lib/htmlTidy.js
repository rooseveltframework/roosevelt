// html tidy

require('colors')

const tidy = require('htmltidy2').tidy
const fs = require('fs')
const path = require('path')
const tamper = require('tamper')
const template = require('es6-template-strings')
const tidyErrorPage = fs.readFileSync(path.join(__dirname, '../defaultErrorPages/views/htmlTidy.html'))
const Prism = require('prismjs')
const prismPath = require.resolve('prismjs')
const prismStyleSheet = fs.readFileSync(path.join(prismPath.split('prism.js')[0], 'themes/prism.css'))

module.exports = function (app, callback) {
  const params = app.get('params')
  const logger = require('./tools/logger')(params.logging)

  // If in production mode, exit
  if (app.get('env') === 'production') {
    logger.warn('HTML tidy disabled. Continuing without HTML validation...'.yellow)
  } else {
    applyValidatorMiddleware()
  }

  callback()

  function applyValidatorMiddleware () {
    app.use(tamper((req, res) => {
      let tidyOpts = {
        doctype: 'html5',
        indent: 'auto',
        indentSpaces: 2,
        wrap: 0,
        showInfo: true,
        showWarnings: true,
        showErrors: 6,
        forceOutput: false,
        quiet: true
      }
      let model = {}
      let formattedHTML
      let formattedTidy
      let lineErrors = []
      let errorLineIndex
      let markupArray
      let markupLine
      let recommendedArray

      // HTML page has not been tidied yet
      res.setHeader('htmltidy', false)

      if (res.statusCode === 200 && res.getHeader('Content-Type') && res.getHeader('Content-Type').includes('text/html')) {
        return body =>
          new Promise((resolve) => {
            tidy(body, tidyOpts, function (htmlErrors, tidyHtml) {
              // Tidy executed on HTML page
              res.setHeader('htmltidy', true)

              if (htmlErrors) {
                // Rendered view line by line
                markupArray = body.split('\n')
                recommendedArray = tidyHtml.split('\n')

                // Get number value for html error to highlight in markup
                for (let line of htmlErrors.match(/line\s\d+/g)) {
                  lineErrors.push(parseInt(line.match(/\d+/g)[0]))
                }

                // Highlight and add line numbers to html
                formattedHTML = `<pre class='markup'>\n<code class="language-html">\n`
                for (let i = 0; i < markupArray.length; i++) {
                  markupLine = markupArray[i]
                  errorLineIndex = lineErrors.indexOf(i + 1)
                  if (errorLineIndex >= 0) {
                    formattedHTML += `<span title='${lineErrors[errorLineIndex]}' class='line-numbers error'>${Prism.highlight(`${markupLine}`, Prism.languages.markup)}</span>`
                  } else {
                    formattedHTML += `<span class='line-numbers'>${Prism.highlight(`${markupLine}`, Prism.languages.markup)}</span>`
                  }
                }

                // Highlight and add line numbers to tidied html
                formattedTidy = `<pre class='markup'>\n<code class="language-html">\n`
                for (let j = 0; j < recommendedArray.length; j++) {
                  formattedTidy += `<span class='line-numbers'>${Prism.highlight(`${recommendedArray[j]}`, Prism.languages.markup)}</span>`
                }

                // Scrub html string to display correctly on page
                htmlErrors = htmlErrors.replace(/[<>]|Warning: /g, '')

                // Build markup template
                res.status(500)
                model.prismStyle = prismStyleSheet.toString()
                model.pageTitle = 'HTML did not pass validation'
                model.pageHeader = 'HTML did not pass validator:'
                model.preWidth = markupArray.length.toString().length * 8
                model.errors = `<h2>Errors:</h2>\n<pre class="validatorErrors">${htmlErrors}</pre>`
                model.markup = `<h2>Markup used:</h2>\n<h2>Tidied HTML Page:</h2>\n${formattedHTML}</code>\n</pre>`
                model.recommended = `${formattedTidy}</code\n</pre>`
                body = template(tidyErrorPage, model)
              }
              resolve(body)
            })
          })
      }
    }))
  }
}
