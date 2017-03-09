var colors = require('colors'),
    validator = require('html-validator'),
    path = require('path');

colors.setTheme({
  warn: 'yellow',
  error: 'red'
});

module.exports = function(app) {
  var params = app.get('params'),
      options,
      i,

      errorArr,
      errorArrLength,
      errorLine,
      formattedErrors,
      formattedErrorArrLength,
      warningHeader,
      errorsWithoutWarnings,
      lastErrorLine,

      htmlArr,
      htmlArrLength,
      htmlLine,
      formattedHTML,

      errorPage = path.normalize(__dirname + '/../defaultErrorPages/views/validatorErrors'),
      validatorDisabled;

  if (!params.enableValidator) {
    validatorDisabled = true;
  }

  if (!params.htmlValidator) {
    options = {
      format: 'text'
    };
  }
  else {
    options = params.htmlValidator;
  }

  app.use(function(req, res, next) {

    // get a reference to the original render
    var renderReference = res.render;

    // override it
    res.render = function(view, model, fn) {

      var thisReference = this;

      // get the html for this specific render
      app.render(view, model, function(err, html) {

        if (process.env.NODE_ENV === 'development' && !validatorDisabled && req.header !== 'Partial' && !model._disableValidator) {
          // run HTML validator and display errors on page
          options.data = html;

          validator(options, function(error, htmlErrorData) {
            if (error) {
              console.error(error);
              model.pageTitle = 'Cannot connect to validator';
              model.pageHeader = 'Unable to connect to HTML validator';
              renderReference.call(thisReference, errorPage, model, fn);
            }
            else if (htmlErrorData.indexOf('There were errors.') > -1) {
              // Add newline after errors and warnings
              errorArr = htmlErrorData.split('\n');
              errorArrLength = errorArr.length;
              formattedErrors = 'Errors:\n';
              if (options.suppressWarnings) {
                warningHeader = false;
              }
              else {
                warningHeader = true;
              }
              for (i = 0; i < errorArrLength; i++) {
                errorLine = errorArr[i];
                if (errorLine.startsWith('From line') || errorLine.startsWith('At line')) {
                  formattedErrors += errorLine + '\n\n';
                }
                else if (errorLine.startsWith('Warning:') && warningHeader === true) {
                  formattedErrors += 'Warnings:\n' + errorLine + '\n';
                  warningHeader = false;
                }
                else {
                  formattedErrors += errorLine + '\n';
                }
                if (errorLine.startsWith('There were errors')) {
                  lastErrorLine = errorLine;
                }
              }

              // Suppress warnings if suppressWarnings param is true
              if (options.suppressWarnings) {
                formattedErrorArr = formattedErrors.split('Warning:');
                formattedErrorArrLength = formattedErrorArr.length;
                errorsWithoutWarnings = '';
                for (i = 0; i < formattedErrorArrLength; i++) {
                  errorLine = formattedErrorArr[i];
                  if (!errorLine.startsWith(' ')) {
                    errorLine.slice(0);
                    errorsWithoutWarnings += errorLine;
                  }
                  if (i === formattedErrorArrLength - 1) {
                    errorsWithoutWarnings += lastErrorLine;
                  }
                }
                model.htmlErrors = errorsWithoutWarnings;
              }
              else {
                model.htmlErrors = formattedErrors;
              }

              // Add line numbers to html
              htmlArr = html.split('\n');
              htmlArrLength = htmlArr.length;
              formattedHTML = '';
              for (i = 0; i < htmlArrLength; i++) {
                htmlLine = htmlArr[i];
                htmlLine = (i + 1) + '  ' + htmlLine + '\n';
                formattedHTML += htmlLine;
              }

              model.markup = formattedHTML;
              model.pageTitle = 'HTML did not pass validation';
              model.pageHeader = 'HTML did not pass validator:';
              renderReference.call(thisReference, errorPage, model, fn);
            }
            else {
              renderReference.call(thisReference, view, model, fn);
            }
          });
        }
        else {
          renderReference.call(thisReference, view, model, fn);
        }
      });
    };
    next();
  });
};
