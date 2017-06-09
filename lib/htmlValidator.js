// html validator

require('colors');

var validator = require('html-validator'),
    path = require('path'),
    spawn = require('child_process').spawn,
    vnu = require('vnu-jar');

module.exports = function(app, callback) {
  var params = app.get('params'),
      validatorProcess,
      promise,
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
      validatorTimeout,
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

    // only run validator if in development mode
    if (process.env.NODE_ENV === 'development') {
      // spawn validator child process
      promise = (() => {
        return new Promise((resolve, reject) => {
          validatorProcess = spawn(
            'java', ['-Xss1024k', '-cp', vnu, 'nu.validator.servlet.Main', params.htmlValidator.port ? params.htmlValidator.port : '8888']
          );

          console.log('\u23F3  ' + ('Starting HTML validator...').bold.yellow);

          validatorProcess.stdout.on('data', (data) => {
            if (`${data}`.includes('Initialization complete')) {
              clearTimeout(validatorTimeout);
              console.log('✔️  ' + ('Validator initialization completed successfully. HTML validator listening on port: ' + params.htmlValidator.port).bold.green);
              resolve();
            }
          });

          validatorProcess.stderr.on('data', (data) => {
            if (`${data}`.includes('No Java runtime present, requesting install.')) {
              console.error('❌  ' + ('There was an error in authentication. Please make sure to have Java installed.').red);
              reject();
            }
          });

          validatorProcess.on('error', (err) => {
            if (err.code === 'ENOENT' ) {
              console.error('❌  ' + ('You must install Java to continue. HTML validation disabled, error on initialization (check to make sure Java is installed and in your path)').red);
              reject();
            }
            else {
              console.error('❌  ' + (err).red);
              reject();
            }
          });

          validatorTimeout = setTimeout(function() {
            console.error('❌  ' + ('HTML Validator has timed out.').red);
            reject();
          }, 20000);
        });
      })();
    }
  };

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

  Promise.all([promise]).then((result) => {
    // only show this error if validator is not enabled / app is in dev mode
    if (!params.enableValidator && process.env.NODE_ENV === 'development') {
      console.error(('⚠️  ' + 'HTML validator disabled. Continuing without HTML validation...').yellow);
    }
    callback();
  }).catch((result) => {
    // only show this error if app is in dev mode
    if (process.env.NODE_ENV === 'development') {
      console.error(('⚠️  ' + 'HTML validator disabled. Continuing without HTML validation...').yellow);
    }
    validatorDisabled = true;
    callback();
  });
};
