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
      errorArr,
      htmlArr,
      errorLine,
      htmlLine,
      formattedErrors = '',
      formattedHTML = '',
      i,
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

        if (process.env.NODE_ENV === 'development' && !validatorDisabled) {
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
              // Suppress warnings if suppressWarnings param is true
              if (options.suppressWarnings) {
                errorArr = htmlErrorData.split('Warning:');
                for (i = 0; i < errorArr.length; i++) {
                  errorLine = errorArr[i];
                  if (!errorLine.startsWith(' ')) {
                    errorLine.slice(0);
                    formattedErrors += errorLine;
                  }
                  if (i = errorArr.length) {
                    formattedErrors += 'There were errors. (Tried in the text/html mode.)';
                  }
                }
                model.htmlErrors = formattedErrors;
              }
              else {
                model.htmlErrors = htmlErrorData;
              }

              // Add line numbers to html
              htmlArr = html.split('\n');
              for (i = 0; i < htmlArr.length; i++) {
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
