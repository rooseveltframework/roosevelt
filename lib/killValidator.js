require('colors');

var exec = require('child_process').exec,
    http = require('http'),
    net = require('net'),
    host = 'localhost',
    foundValidator = false,
    pid,
    startPort = 1,
    endPort = 10000,
    timeout = 2000,
    currentPort,
    validatorOptions = {
      url: 'http://localhost',
      port: 8888,
      method: 'GET',
      headers: {
        'User-Agent': 'request'
      }
    };

/**
 * gets validator, if not on specified port, calls to search function
 * @function getValidator
 */
function getValidator() {
  http.get(validatorOptions, function(res) {
    const { statusCode } = res;

    let error,
        rawData = '';
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' +
                        `Status Code: ${statusCode}`);
    }
    if (error) {
      // consume 404 respone data
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
        // console.log(rawData);
        if (rawData.includes('<title>Ready to check  - Nu Html Checker</title>')) {
          console.log('✔️  ' + ('Validator successfully found on port: ' + validatorOptions.port).green);
          foundValidator = true;
          killValidator(validatorOptions.port);
        }
        else {
          console.warn('⚠️  ' + ('Could not find validator on port: ' + validatorOptions.port + '. ' +  'Scanning for validator now...').bold.yellow);
          scanForValidator();
        }
      }
      catch (err) {
        console.error(err.message);
      }
    });
  }).on('error', (error) => {
    if (error.message.includes('ECONNREFUSED')) {
      console.warn('⚠️  ' + ('Could not find validator on port: ' + validatorOptions.port + '. ' +  'Scanning for validator now...').bold.yellow);
      scanForValidator();
    }
    else {
      console.error('❌  ' + (`error: ${error.message}`).red);
    }
  });
}
getValidator();

/**
 * scans available ports for html validator
 * @function scanForValidator
 */
function scanForValidator() {

  while (startPort <= endPort) {
    currentPort = startPort;

    (function(currentPort) {
      var socket = new net.Socket();

      socket.setTimeout(timeout, function() {

        socket.destroy();
      });

      socket.connect(currentPort, host, function() {
        var options = {
          url: 'http://localhost:',
          port: currentPort,
          method: 'GET',
          headers : {
            'User-Agent': 'request'
          }
        };

        http.get(options, function(res) {
          res.setEncoding('utf8');

          let rawData = '';

          res.on('data', (chunk) => {
            rawData += chunk;
          });

          res.on('end', () => {
            try {
              if (rawData.includes('<title>Ready to check  - Nu Html Checker</title>')) {
                console.log('✔️  ' + ('Validator succesfully found on port: ' + currentPort).green);
                foundValidator = true;
                killValidator(currentPort);
                // process.exit();
              }
            }
            catch (err) {
              console.error('Error here:', err.message);
            }
          });
        }).on('error', (error) => {
          // possibly revisit here if errors show up
        });
      });

      socket.on('error', function(error) {
        if (error.message.includes('ECONNRESFUSED')) {
          // handling for this error, continue as normal
        }
      });
    })(currentPort);
    startPort++;
  }
  setTimeout(function() {
    if (foundValidator === false) {
      console.error('❌  ' + ('Could not find the validator at this time, please make sure that the validator is running.').red);
      process.exit();
    }
  }, 15000);
}

/**
 * kills the html validator
 * @function killValidator
 * @param {number} currentPort - current port that the validator is listening on
 */
function killValidator(currentPort) {
  // for Windows
  if (process.platform === 'win32') {
    exec('netstat -n -a -o | findstr 0.0.0.0:' + currentPort + '.*LISTENING', function(err, stdout, stderr) {
      if (err) {
        console.error(err);
      }

      pid = stdout.match(/\d+$/gm);
      if (!pid) {
        throw new TypeError('❌  ' + ('No PID found on port.').red);
      }
      else {
        console.log('🔍  ' + ('Found pid ' + pid + ' on port: ' + currentPort + '. Killing ' + pid + '...').magenta);

        process.kill(pid);
        console.log('✔️  ' + ('Pid ' + pid + ' has been killed').green);
      }
      console.log('✔️  ' + ('Validator successfully closed on port: ' + currentPort).bold.green);
      process.exit();
    });
  }
  // for Mac and Ubuntu
  if (process.platform === 'darwin' || process.platform === 'linux') {
    exec('lsof -t -i:' + currentPort + ' | kill -9 $(lsof -t -i:' + currentPort +')', function(err, stdout, stderr) {
      if (err) {
        console.error(err);
      }
      console.log('✔️  ' + ('Killed process on port:', currentPort).green);
      process.exit();
    });
  }
}
