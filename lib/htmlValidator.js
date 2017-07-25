// html validator

require('colors');

var validator = require('html-validator'),
    path = require('path'),
    spawn = require('child_process').spawn,
    vnu = require('vnu-jar'),
    http = require('http'),
    validatorOptions = {
      url: 'http://localhost',
      port: 8888,
      method: 'GET',
      headers: {
        'User-Agent': 'request'
      }
    };

module.exports = function(app, callback) {
  var params = app.get('params'),
      validatorProcess,
      validatorShutdown,
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
      isError = false,
      calledKill = false,
      htmlLine,
      formattedHTML,
      validatorTimeout,
      errorPage = path.normalize(__dirname + '/../defaultErrorPages/views/validatorErrors'),
      validatorDisabled;

  process.argv.forEach(function(val, index, array) {
    switch (val) {
      case 'detach-validator':
        params.htmlValidator.separateProcess = true;
        break;
      case 'attach-validator':
        params.htmlValidator.separateProcess = false;
        break;
    }
  });

  if (!params.enableValidator) {
    validatorDisabled = true;
    if (!params.enableValidator) {
      console.warn(('⚠️  ' + 'HTML validator disabled. Continuing without HTML validation...').yellow);
    }
    callback();
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

    // only run validator if in dev mode
    if (process.env.NODE_ENV === 'development') {
      callValidator();
    }

    function callValidator() {
      return new Promise((resolve, reject) => {
        isError = false;

        // see if there's one already running
        http.get(validatorOptions, function(res) {
          const { statusCode } = res;

          let error,
              rawData = '';
          if (statusCode !== 200) {
            error = new Error('Request Failed.\n' +
                              `Status Code: ${statusCode}`);
          }
          if (error) {
            // consume 404 response data
            console.error(error.message);
            res.resume();
            return;
          }

          res.setEncoding('utf8');

          res.on('data', (chunk) => {
            rawData += chunk;
          });

          res.on('end', () => {
            try {
              if (rawData.includes('Nu Html Checker')) {
                console.log('✔️  ' + ('Detached validator found on port: ' + validatorOptions.port).bold.green);
                calledKill = true;
                clearTimeout(validatorTimeout);
                console.log('🎧  ' + ('HTML validator listening on port: ' + params.htmlValidator.port).bold);
                applyValidatorMiddleware();
                resolve();
              }
              else {
                // spawn a new one
                spawnNewValidator();
              }
            }
            catch (err) {
              // spawn a new one
              spawnNewValidator();
            }
          });
        }).on('error', (error) => {
          // spawn a new one
          spawnNewValidator();
        });

        function spawnNewValidator() {
          validatorProcess = spawn(
            'java', ['-Xss1024k', '-cp', vnu, 'nu.validator.servlet.Main', params.htmlValidator.port ? params.htmlValidator.port : '8888'], {detached: params.htmlValidator.separateProcess}
          );

          console.log('⌛  ' + ('Starting HTML validator...').bold.yellow);

          validatorProcess.stderr.on('data', (data) => {
            if (`${data}`.includes('No Java runtime present, requesting install.')) {
              console.error('❌  ' + ('There was an error in authentication. Please make sure to have Java installed.').red);
              reject();
            }
            if (`${data}`.includes('Address already in use')) {
              isError = true;

              if (!params.htmlValidator.separateProcess && calledKill === false) {
                calledKill = true;
                validatorShutdown = spawn('node', ['./node_modules/roosevelt/lib/killValidator.js']);
                console.warn('⚠️  ' + ('Port ' + params.htmlValidator.port + ' already in use. Shutting down other process on port...').bold.yellow);

                validatorShutdown.stderr.on('data', (data) => {
                  if (`${data}`.includes('No PID found on port.')) {
                    reject('No PID');
                  }
                });

                validatorShutdown.on('error', (err) => {
                  if (err) {
                    console.error('Error: ', err);
                  }
                });

                validatorShutdown.on('exit', function() {
                  // signal validator to restart
                  reject('Restart');
                });
              }
              else {
                if (calledKill === false) {
                  calledKill = true;
                  console.log('✔️  ' + ('Validator already detached').green);
                  clearTimeout(validatorTimeout);
                  console.log('🎧  ' + ('HTML validator listening on port: ' + params.htmlValidator.port).bold);
                  applyValidatorMiddleware();
                  resolve();
                }
              }
            }
            if (`${data}`.includes('INFO:oejs.Server:main: Started')) {
              setTimeout (function() {
                if (isError === false) {
                  clearTimeout(validatorTimeout);
                  if (params.htmlValidator.separateProcess) {
                    console.log('🎧  ' + ('HTML validator listening on port: ' + params.htmlValidator.port + ' (as a detached, backgrounded process)').bold);
                  }
                  else {
                    console.log('🎧  ' + ('HTML validator listening on port: ' + params.htmlValidator.port).bold);
                  }
                  applyValidatorMiddleware();
                  resolve();
                }
              }, 5000);
            }
          });

          validatorProcess.stderr.on('error', (err) => {
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
            console.error('❌  ' + ('HTML validator has timed out.').red);
            reject();
          }, 30000);
        }
      }).then(result => {
        clearTimeout(validatorTimeout);
        if (!params.enableValidator) {
          console.warn(('⚠️  ' + 'HTML validator disabled. Continuing without HTML validation...').yellow);
        }
        callback();
      }).catch(result => {
        clearTimeout(validatorTimeout);
        if (result === 'Restart') {
          console.log(('⌛  ' + 'Restarting validator...').bold.yellow);
          callValidator();
        }
        else if (result === 'No PID') {
          console.error('❌  ' + ('Unable to start validator. No PID found on specified port.').red);
          callback();
        }
        else {
          console.error('❌  ' + ('Unable to start validator.').red);
          callback();
        }
      });
    };
  };

  function applyValidatorMiddleware() {
    app.use(function(req, res, next) {

      // get a reference to the original render
      var renderReference = res.render;

      // override it
      res.render = function(view, model, fn) {

        var thisReference = this;

        // get the html for this specific render
        app.render(view, model, function(err, html) {

          if (!validatorDisabled && res.get(headerException) !== 'true' && !model[modelException] && html) {
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
  }
};
