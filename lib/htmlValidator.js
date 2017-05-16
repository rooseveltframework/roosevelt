// html validator

var validator = require('html-validator'),
    path = require('path'),
    spawn = require('child_process').spawn,
    vnu = require('vnu-jar');

module.exports = function(app) {
  var params = app.get('params'),
      headerException = params.validatorExceptions.requestHeader,
      modelException = params.validatorExceptions.modelValue,
      options,
      i,
      errorArr,
      errorArrLength,
      errorLine,
      errorList,
      warningList,
      htmlArr,
      htmlArrLength,
      htmlLine,
      formattedHTML,
      errorPage = path.normalize(__dirname + '/../defaultErrorPages/views/validatorErrors'),
      validatorDisabled;

  if (!params.enableValidator) {
    validatorDisabled = true;
  }
  else {
    if (!params.htmlValidator) {
      options = {
        validator: 'http://localhost:8888',
        format: 'text'
      };
    }
    else {
      params.htmlValidator.validator = 'http://localhost:' + (params.htmlValidator.port ? params.htmlValidator.port : '8888');
      options = params.htmlValidator;
    }

    // spawn validator child process
    spawn(
      'java', ['-cp', vnu, 'nu.validator.servlet.Main', params.htmlValidator.port ? params.htmlValidator.port : '8888']
    );
  }

  app.use(function(req, res, next) {

    // get a reference to the original render
    var renderReference = res.render;

    // override it
    res.render = function(view, model, fn) {

      var thisReference = this;

      // get the html for this specific render
      app.render(view, model, function(err, html) {

        if (process.env.NODE_ENV === 'development' && !validatorDisabled && res.get(headerException) !== 'true' && !model[modelException] && html) {
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
              errorList = '';
              warningList = '';
              errorArr = htmlErrorData.split('\n');
              errorArrLength = errorArr.length;

              for (i = 0; i < errorArrLength; i++) {
                errorLine = errorArr[i];
                if (errorLine.startsWith('Error')) {
                  if (errorArr[i+1].startsWith('From line') || errorArr[i+1].startsWith('At line')) {
                    errorList += errorLine + '\n' + errorArr[i+1] + '\n\n';
                  }
                  else {
                    errorList += errorLine + '\n\n';
                  }
                }
                else if (errorLine.startsWith('Warning')) {
                  if (errorArr[i+1].startsWith('From line') || errorArr[i+1].startsWith('At line')) {
                    warningList += errorLine + '\n' + errorArr[i+1] + '\n\n';
                  }
                  else {
                    warningList += errorLine + '\n\n';
                  }
                }
              }

              model.htmlErrors = errorList;

              if (!options.suppressWarnings) {
                model.htmlWarnings = warningList = '' ? undefined : warningList;
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
