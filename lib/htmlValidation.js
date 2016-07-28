// Handles HTML Validation for processed html
'use strict';

var colors = require('colors'),
    validator = require('html-validator'),
    appDir = require('./getAppDir'),
    pkg = require(appDir + 'package.json');
pkg.rooseveltConfig = pkg.rooseveltConfig || {};

module.exports = function(app, process) {
  var disabledHTMLValidation = false,
      htmlValidatorOpts = {
        format: 'text'
      };

  app.set('package', pkg);

  if (pkg.rooseveltConfig.validationUrl) {
    htmlValidatorOpts.validator = pkg.rooseveltConfig.validationUrl;
  }

  // Checks if -dev flag was used in npm script and runs any other options that may be used with it
  if (process.argv.indexOf('no-html-validator') !== - 1) {
    // Checks if command includes '-no-html-validator' and assigns a value to a boolean
    console.warn(('HTML validation has been disabled. The application may be running with invalid code.\nIt is recommended that you develop with validation enabled if possible.').yellow);
    disabledHTMLValidation = true;
  }

  // Load HTML validator middleware
  app.use(function(req, res, next) {

    // get a reference to the original render
    var renderReference = res.render,
        model = require('models/global')(req, res);

    // override it
    res.render = function(view, options, fn) {

      var thisReference = this;

      // get the html for this specific render
      app.render(view, options, function(err, html) {
        var isPartial = false;

        htmlValidatorOpts.data = html;

        if (res.get('Partial') === 'true') {
          isPartial = true;
        }

        if (process.env.NODE_ENV === 'development' && !disabledHTMLValidation && !isPartial) {
          // Handles HTML Validation and displays on page any errors
          validator(htmlValidatorOpts, function(error, htmlErrorData) {
            if (error) {
              model.content.pageTitle = '{content.appTitle} - 500 Internal Server Error';
              model.host = req.hostname;
              model.url = req.url;
              model.appVersion = req.app.get('package').version;
              model.extraInfo = 'The HTML validator cannot run because you are not connected to a network.';
              model.status = 500;
              model.suppressHeader = true;
              renderReference.call(thisReference, '500', model, fn);
            }
            else if (htmlErrorData.indexOf('There were errors.') > -1) {
              model.content.pageTitle = '{content.appTitle} - HTML validation errors';
              model.content.htmlErrors = htmlErrorData;
              renderReference.call(thisReference, 'htmlErrorPage', model, fn);
            }
            else {
              renderReference.call(thisReference, view, options, fn);
            }
          });
        }
        else {
          renderReference.call(thisReference, view, options, fn);
        }
      });
    };
    next();
  });
};
