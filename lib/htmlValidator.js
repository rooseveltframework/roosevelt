var colors = require('colors'),
    validator = require('html-validator'),
    path = require('path');

colors.setTheme({
  warn: 'yellow',
  error: 'red'
});

module.exports = function(app) {
  var params = app.get('params'),
      model = {}, /* eslint no-unused-vars: 0 */
      options,
      errorPage = path.normalize(__dirname + '/../defaultErrorPages/views/validatorErrors'),
      validatorDisabled;

  if (!params.validator) {
    validatorDisabled = true;
  }
  else if (process.argv.indexOf('no-html-validator') !== -1) {
    console.warn(('HTML validation has been disabled. The application may be running with invalid code.' +
      '\nIt is recommended that you develop with validation enabled if possible.').warn);
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
              model.pageTitle = 'Cannot Connect to Validator';
              model.pageHeader = 'Unable to connect to HTML Validator';
              renderReference.call(thisReference, errorPage, model, fn);
            }
            else if (htmlErrorData.indexOf('There were errors.') > -1) {
              model.pageTitle = 'HTML Did Not Pass Validation';
              model.pageHeader = 'HTML Did not pass validator:';
              model.htmlErrors = htmlErrorData;
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
