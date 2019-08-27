/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const configAuditor = require('../../lib/scripts/configAuditor')
const { fork } = require('child_process')
const fse = require('fs-extra')
const generateTestApp = require('../util/generateTestApp')
const os = require('os')
const path = require('path')
const { spawnSync } = require('child_process')

describe('Roosevelt Config Auditor Test', function () {
  // path to the test app Directory
  const appDir = path.join(__dirname, '../app/configAuditorTest')

  // options to pass into test app generator
  const options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  // variable to hold the data that will be written to the package.json file for each test
  let packageJSONSource = {}

  beforeEach(function (done) {
    // create sample config
    const sampleContent = {
      modelsPath: 'mvc/models',
      viewsPath: 'mvc/views',
      controllersPath: 'mvc/controllers',
      htmlValidator: {
        enable: true,
        separateProcess: {
          enable: true,
          autoKiller: true,
          autoKillerTimeout: 3600000
        },
        port: 48888,
        showWarnings: true,
        exceptions: {
          requestHeader: 'Partial',
          modelValue: '_disableValidator'
        }
      },
      css: {
        sourcePath: 'css',
        compiler: 'none',
        whitelist: null,
        output: '.build/css',
        symlinkToPublic: true,
        versionFile: null
      },
      js: {
        sourcePath: 'js',
        compiler: 'none',
        whitelist: null,
        blacklist: null,
        output: '.build/js',
        symlinkToPublic: true,
        bundler: {
          bundles: [],
          output: '.bundled',
          expose: true
        }
      }
    }
    // grab the content of the script file
    const scriptContent = JSON.parse(fse.readFileSync(path.join(__dirname, '../../lib/defaults/scripts.json')).toString('utf8'))
    // add the defaultContent to packageJSONSource
    packageJSONSource.rooseveltConfig = sampleContent
    // separate the commands from the rest of the data in the scripts file
    packageJSONSource.scripts = {}
    const keys = Object.keys(scriptContent)
    for (let x = 0; x < keys.length; x++) {
      packageJSONSource.scripts[keys[x]] = scriptContent[keys[x]].value
    }
    done()
  })

  // clean up the test app directory after each test
  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should be able to scan the package.json file in the test App Directory and find which parameters are missing from it', function (done) {
    // bool vars to hold whether or not the right logs and errors are being outputted
    let startingConfigAuditBool = false
    let modelsPathMissingBool = false
    let viewsPathMissingBool = false
    let controllersPathMissingBool = false
    let error1Bool = false
    let error2Bool = false

    // write the package.json file
    fse.ensureDirSync(path.join(appDir))
    delete packageJSONSource.rooseveltConfig.modelsPath
    delete packageJSONSource.rooseveltConfig.viewsPath
    delete packageJSONSource.rooseveltConfig.controllersPath
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // generate the test app
    generateTestApp({
      appDir: appDir,
      onServerStart: '(app) => {process.send("something")}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream, check for specific logs
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    // on the error stream, check for error specific logs
    testApp.stderr.on('data', (data) => {
      if (data.includes('Missing param "modelsPath" at rooseveltConfig.modelsPath!')) {
        modelsPathMissingBool = true
      }
      if (data.includes('Missing param "viewsPath" at rooseveltConfig.viewsPath!')) {
        viewsPathMissingBool = true
      }
      if (data.includes('Missing param "controllersPath" at rooseveltConfig.controllersPath!')) {
        controllersPathMissingBool = true
      }
      if (data.includes('Issues have been detected in rooseveltConfig')) {
        error1Bool = true
      }
      if (data.includes('for the latest sample rooseveltConfig.')) {
        error2Bool = true
      }
    })

    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the configAuditor')
      assert.strictEqual(modelsPathMissingBool, true, 'configAuditor did not report that the package.json file is missing a models path value')
      assert.strictEqual(viewsPathMissingBool, true, 'configAuditor did not report that the package.json file is missing a views path value')
      assert.strictEqual(controllersPathMissingBool, true, 'configAuditor did not report that the package.json file is missing a controllers path value')
      assert.strictEqual(error1Bool, true, 'configAuditor did not report that we had issues with the roosevelt config')
      assert.strictEqual(error2Bool, true, 'configAuditor did not report where a user can go to for examples of correct syntax and values')
      done()
    })
  })

  it('should be able to require the configAuditor and run the function and get a response of the things that are missing', function (done) {
    // arrays to hold the responses that we would get from configAuditor
    const logs = []
    let errors = []

    // hook for stdout and stderr streams
    const hookStream = function (_stream, fn) {
      // reference default write method
      const oldWrite = _stream.write
      // _stream now write with our shiny function
      _stream.write = fn

      return function () {
        // reset to the default write method
        _stream.write = oldWrite
      }
    }

    // hook up standard output
    const unhookStdout = hookStream(process.stdout, function (string, encoding, fd) {
      logs.push(string)
    })
    const unhookStderr = hookStream(process.stderr, function (string, encoding, fd) {
      errors.push(string)
    })

    // make the appDir folder
    fse.ensureDirSync(appDir)
    // add the package.json file to the appDir folder
    delete packageJSONSource.rooseveltConfig.modelsPath
    delete packageJSONSource.rooseveltConfig.viewsPath
    delete packageJSONSource.rooseveltConfig.controllersPath
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // use the configAuditor's audit method
    configAuditor.audit(appDir)

    // unhook stdout/stderr
    unhookStdout()
    unhookStderr()

    // Compact the errors into one string
    errors = errors.join('\n')

    const test1 = logs[0].includes('Starting rooseveltConfig audit...')
    const test2 = errors.includes('Missing param "modelsPath" at rooseveltConfig.modelsPath!')
    const test3 = errors.includes('Missing param "viewsPath" at rooseveltConfig.viewsPath!')
    const test4 = errors.includes('Missing param "controllersPath" at rooseveltConfig.controllersPath!')
    const test5 = errors.includes('Issues have been detected in rooseveltConfig')
    const test6 = errors.includes('for the latest sample rooseveltConfig.')
    assert.strictEqual(test1, true, 'Roosevelt did not start the configAuditor')
    assert.strictEqual(test2, true, 'configAuditor did not report that the package.json file is missing a models path value')
    assert.strictEqual(test3, true, 'configAuditor did not report that the package.json file is missing a views path value')
    assert.strictEqual(test4, true, 'configAuditor did not report that the package.json file is missing a controllers path value')
    assert.strictEqual(test5, true, 'configAuditor did not report that we had issues with the roosevelt config')
    assert.strictEqual(test6, true, 'configAuditor did not report where a user can go to for examples of correct syntax and values')
    done()
  })

  it('should allow a user to run the configAuditor as a child process and get it to tell the user what params are missing from the package.json file', function (done) {
    // bool vars to hold whether or not the right logs and errors are being outputted
    let startingConfigAuditBool = false
    let modelsPathMissingBool = false
    let viewsPathMissingBool = false
    let controllersPathMissingBool = false
    let error1Bool = false
    let error2Bool = false

    // write the package.json file
    fse.ensureDirSync(appDir)
    delete packageJSONSource.rooseveltConfig.modelsPath
    delete packageJSONSource.rooseveltConfig.viewsPath
    delete packageJSONSource.rooseveltConfig.controllersPath
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // fork the configAuditor.js file and run it as a child process
    const testApp = fork(path.join(appDir, '../../../lib/scripts/configAuditor.js'), [], { cwd: appDir, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    testApp.stderr.on('data', (data) => {
      if (data.includes('Missing param "modelsPath" at rooseveltConfig.modelsPath!')) {
        modelsPathMissingBool = true
      }
      if (data.includes('Missing param "viewsPath" at rooseveltConfig.viewsPath!')) {
        viewsPathMissingBool = true
      }
      if (data.includes('Missing param "controllersPath" at rooseveltConfig.controllersPath!')) {
        controllersPathMissingBool = true
      }
      if (data.includes('Issues have been detected in rooseveltConfig')) {
        error1Bool = true
      }
      if (data.includes('for the latest sample rooseveltConfig.')) {
        error2Bool = true
      }
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'configAuditor did not start')
      assert.strictEqual(modelsPathMissingBool, true, 'configAuditor did not report that the package.json file is missing a models path value')
      assert.strictEqual(viewsPathMissingBool, true, 'configAuditor did not report that the package.json file is missing a views path value')
      assert.strictEqual(controllersPathMissingBool, true, 'configAuditor did not report that the package.json file is missing a controllers path value')
      assert.strictEqual(error1Bool, true, 'configAuditor did not report that we had issues with the roosevelt config')
      assert.strictEqual(error2Bool, true, 'configAuditor did not report where a user can go to for examples of correct syntax and values')
      done()
    })
  })

  it('should not execute the configAuditor if the app already has a public folder in the app Directory', function (done) {
    // bool var to hold whether or not a specific log was given
    let startingConfigAuditBool = false

    // write the package.json file
    fse.ensureDirSync(appDir)
    delete packageJSONSource.rooseveltConfig.modelsPath
    delete packageJSONSource.rooseveltConfig.viewsPath
    delete packageJSONSource.rooseveltConfig.controllersPath
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // create a public folder inside the app Directory
    fse.ensureDir(path.join(appDir, 'public'))

    // generate the test app
    generateTestApp({
      appDir: appDir,
      onServerStart: '(app) => {process.send("something")}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream, check for specific logs
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check for assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, false, 'Roosevelt ')
      done()
    })
  })

  it('should not start the audit if there is not a package.json file located in the test app Directory', function (done) {
    // bool var to hold whether or not the audit looked at the files
    let rooseveltAuditStartedBool = false

    // generate the test app
    generateTestApp({
      appDir: appDir,
      onServerStart: '(app) => {process.send("something")}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream, check for specific logs to see if it would log out that the config audtior is starting
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        rooseveltAuditStartedBool = true
      }
    })

    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check for assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(rooseveltAuditStartedBool, false, 'the config Auditor was still started even though there is no package.json file in the app Directory')
      done()
    })
  })

  it('should not start the audit if there is a package.json file located in the test app Directory but no rooseveltConfig property in it', function (done) {
    // bool var to hold whether or not the audit looked at the files
    let rooseveltAuditStartedBool = false

    // package.json source string
    packageJSONSource = {
      appDir: appDir,
      generateFolderStructure: true
    }

    // generate the package.json file
    fse.ensureDirSync(appDir)
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // generate the test app
    generateTestApp({
      appDir: appDir,
      onServerStart: '(app) => {process.send("something")}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream, check for specific logs to see if it would log out that the config audtior is starting
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        rooseveltAuditStartedBool = true
      }
    })

    testApp.on('message', () => {
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      assert.strictEqual(rooseveltAuditStartedBool, false, 'the config Auditor was still started even though there is no package.json file in the app Directory')
      done()
    })
  })

  it('should report that there are some missing or extra params in the package.json file', function (done) {
    // bool var to hold whether the right logs were given
    let startingConfigAuditBool = false
    let error1Bool = false
    let error2Bool = false
    let missingEnableBool = false
    let missingWhiteListCSSBool = false
    let missingWhiteListJSBool = false
    let missingCompilerJSBool = false
    let extraWarningsJSBool = false

    // write the package.json file
    fse.ensureDirSync(appDir)
    delete packageJSONSource.rooseveltConfig.htmlValidator.enable
    delete packageJSONSource.rooseveltConfig.css.whitelist
    packageJSONSource.rooseveltConfig.js.warnings = true
    delete packageJSONSource.rooseveltConfig.js.compiler
    delete packageJSONSource.rooseveltConfig.js.whitelist
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // generate the test app
    generateTestApp({
      appDir: appDir,
      onServerStart: '(app) => {process.send("something")}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the error strean, check the console output for missing parameters
    testApp.stderr.on('data', (data) => {
      if (data.includes('Missing param "enable" at rooseveltConfig.htmlValidator.enable!')) {
        missingEnableBool = true
      }
      if (data.includes('Missing param "whitelist" at rooseveltConfig.css.whitelist!')) {
        missingWhiteListCSSBool = true
      }
      if (data.includes('Extra param "warnings" found at rooseveltConfig.js.warnings, this can be removed.')) {
        extraWarningsJSBool = true
      }
      if (data.includes('Missing param "compiler" at rooseveltConfig.js.compiler!')) {
        missingCompilerJSBool = true
      }
      if (data.includes('Missing param "whitelist" at rooseveltConfig.js.whitelist!')) {
        missingWhiteListJSBool = true
      }
      if (data.includes('Issues have been detected in rooseveltConfig')) {
        error1Bool = true
      }
      if (data.includes('for the latest sample rooseveltConfig.')) {
        error2Bool = true
      }
    })

    // on the output stream check to see if the config auditor has started
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the configAuditor')
      assert.strictEqual(missingEnableBool, true, 'The config Auditor did not report that enable is missing from the htmlValidator param')
      assert.strictEqual(missingWhiteListCSSBool, true, 'The config Auditor did not report that whitelist is missing from the CSS param')
      assert.strictEqual(missingWhiteListJSBool, true, 'The config Auditor did not report that whitelist is missing from the JS param')
      assert.strictEqual(extraWarningsJSBool, true, 'The config Auditor did not report that an extra param of warnings is in the JS param')
      assert.strictEqual(missingCompilerJSBool, true, 'The config Auditor did not report that compiler is missing from the JS param')
      assert.strictEqual(error1Bool, true, 'configAuditor did not report that we had issues with the roosevelt config')
      assert.strictEqual(error2Bool, true, 'configAuditor did not report where a user can go to for examples of correct syntax and values')
      done()
    })
  })

  it('should report that there are extra params in the rooseveltConfig object', function (done) {
    // bool var to hold whether or not the correct logs are being outputted
    let extraTurboParamBool = false
    let extraMaxServersBool = false
    let error1Bool = false
    let error2Bool = false
    let startingConfigAuditBool = false

    // generate the package.json file
    fse.ensureDirSync(appDir)
    packageJSONSource.rooseveltConfig.turbo = true
    packageJSONSource.rooseveltConfig.maxServers = 4
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // generate the test app
    generateTestApp({
      appDir: appDir,
      onServerStart: '(app) => {process.send("something")}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream, check
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    // on the error stream, check config auditor output
    testApp.stderr.on('data', (data) => {
      if (data.includes('Extra param "turbo" found at rooseveltConfig.turbo, this can be removed.')) {
        extraTurboParamBool = true
      }
      if (data.includes('Extra param "maxServers" found at rooseveltConfig.maxServers, this can be removed.')) {
        extraMaxServersBool = true
      }
      if (data.includes('Issues have been detected in rooseveltConfig')) {
        error1Bool = true
      }
      if (data.includes('for the latest sample rooseveltConfig.')) {
        error2Bool = true
      }
    })

    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the config Auditor')
      assert.strictEqual(extraTurboParamBool, true, 'config Auditor did not spot the extra turbo param in the rooseveltConfig')
      assert.strictEqual(extraMaxServersBool, true, 'config Auditor did not sport the extra maxServers param in the rooseveltConfig')
      assert.strictEqual(error1Bool, true, 'configAuditor did not report that we had issues with the roosevelt config')
      assert.strictEqual(error2Bool, true, 'configAuditor did not report where a user can go to for examples of correct syntax and values')
      done()
    })
  })

  it('should report that package.json contains a roosevelt script that has been incorrectly placed', function (done) {
    // bool var to hold whether or not a specific log was outputted
    let cleanNotUpToDateBool = false
    let startingConfigAuditBool = false
    let error1Bool = false
    let error2Bool = false

    // generate the package.json file
    fse.ensureDirSync(appDir)
    packageJSONSource.scripts.clean = 'node ./node_modules/roosevelt/is_not_correct.js'
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // generate the test app
    generateTestApp({
      appDir: appDir,
      onServerStart: '(app) => {process.send("something")}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream, check to see if the config auditor is running
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    // on the error stream check to see
    testApp.stderr.on('data', (data) => {
      if (data.includes('Detected outdated script "clean". Update contents to "node ./node_modules/roosevelt/lib/scripts/appCleanup.js" to restore functionality.')) {
        cleanNotUpToDateBool = true
      }
      if (data.includes('Issues have been detected in rooseveltConfig')) {
        error1Bool = true
      }
      if (data.includes('for the latest sample rooseveltConfig.')) {
        error2Bool = true
      }
    })

    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check for assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(error1Bool, true, 'configAuditor did not report that we had issues with the roosevelt config')
      assert.strictEqual(error2Bool, true, 'configAuditor did not report where a user can go to for examples of correct syntax and values')
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the config Auditor')
      assert.strictEqual(cleanNotUpToDateBool, true, 'configAuditor did not report that one of its scripts is not up to date with what it should be')
      done()
    })
  })

  it('should not run the config Auditor if it has a cwd without a node_modules folder', function (done) {
    // bool var to hold whether or not a specific log was outputted
    let startingConfigAuditBool = false

    // create a node_modules directory in the test app
    fse.ensureDirSync(appDir)
    fse.mkdirSync(path.join(appDir, 'node_modules'))

    // set env.INIT_CWD to a location that does not have a node_modules folder
    process.env.INIT_CWD = path.join(appDir, '../util')

    // fork the configAuditor.js file and run it as a child process
    const testApp = fork(path.join(appDir, '../../../lib/scripts/configAuditor.js'), [], { cwd: appDir, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the output stream to see if the config auditor is running
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, false, 'Roosevelt started its config Auditor even when it was not suppose to')
      done()
    })
  })

  it('should be able to run the auditor if a node modules folder is located in the cwd', function (done) {
    // bool var to hold whether or not the right logs were outputted
    let startingConfigAuditBool = false
    let receiveOutputBool = false

    // generate the package.json file
    fse.ensureDirSync(appDir)
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // set env.INIT_CWD to the correct location
    process.env.INIT_CWD = appDir

    // create a node_modules folder
    fse.ensureDirSync(path.join(appDir, 'node_modules'))

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, '../../../lib/scripts/configAuditor.js'), [], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    // on the error stream
    testApp.stderr.on('data', (data) => {
      // Because the sample config has missing params, just check that the config auditor completed
      if (data.includes('Issues have been detected in rooseveltConfig')) {
        receiveOutputBool = true
      }
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the config Auditor')
      assert.strictEqual(receiveOutputBool, true, 'config Auditor did not run')
      done()
    })
  })

  it('should use the env var cwd if it matches the processes cwd', function (done) {
    // bool var to hold whether or not the right logs were outputted
    let startingConfigAuditBool = false
    let receiveOutputBool = false

    // set env.INIT_CWD to the correct location
    process.env.INIT_CWD = appDir

    // generate the package.json file
    fse.ensureDirSync(appDir)
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, '../../../lib/scripts/configAuditor.js'), [], { cwd: appDir, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    // on the error stream
    testApp.stderr.on('data', (data) => {
      // Because the sample config has missing params, just check that the config auditor completed
      if (data.includes('Issues have been detected in rooseveltConfig')) {
        receiveOutputBool = true
      }
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the config Auditor')
      assert.strictEqual(receiveOutputBool, true, 'config Auditor did not run')
      done()
    })
  })

  it('should display an error when setting a config param to an unsupported type', function (done) {
    // bool var to see if the right logs are being logged
    let startingConfigAuditBool = false
    let typeErrorBool = false

    // set the port to null and generate the package.json file
    fse.ensureDirSync(appDir)
    packageJSONSource.rooseveltConfig.port = null
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, '../../../lib/scripts/configAuditor.js'), [], { cwd: appDir, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    // on the error stream
    testApp.stderr.on('data', (data) => {
      if (data.includes('The type of param \'port\' should be one of the supported types: number, string')) {
        typeErrorBool = true
      }
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the config Auditor')
      assert.strictEqual(typeErrorBool, true, 'config Auditor is not reporting back that the param is an unsupported type')
      done()
    })
  })

  it('should display an error when a script is missing', function (done) {
    // bool var to see if the right logs are being logged
    let startingConfigAuditBool = false
    let missingScriptBool = false

    // set the css object to a number and generate the package.json file
    fse.ensureDirSync(appDir)
    delete packageJSONSource.scripts.clean
    fse.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, '../../../lib/scripts/configAuditor.js'), [], { cwd: appDir, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    // on the error stream
    testApp.stderr.on('data', (data) => {
      if (data.includes('Missing script "clean"!')) {
        missingScriptBool = true
      }
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the config Auditor')
      assert.strictEqual(missingScriptBool, true, 'config Auditor is not reporting back that the script is missing')
      done()
    })
  })

  it('should report that the node_modules directory is missing some packages or that some are out of date', function (done) {
    // bool var to hold that whether or not a specific warning was outputted
    let missingOrOODPackageBool = false

    // set env.INIT_CWD to the correct location
    process.env.INIT_CWD = appDir

    // command for npm
    let npmName
    if (os.platform() === 'win32') {
      npmName = 'npm.cmd'
    } else {
      npmName = 'npm'
    }

    // set up the node_modules and the package.json file
    fse.ensureDirSync(appDir)

    // Add dependencies to the packageJSONSource
    packageJSONSource.dependencies = {}
    packageJSONSource.dependencies.teddy = '~0.4.0'
    packageJSONSource.dependencies.colors = '~1.2.0'
    packageJSONSource = JSON.stringify(packageJSONSource)

    // Create the package.json file in the app test dir
    fse.writeFileSync(path.join(appDir, 'package.json'), packageJSONSource)

    // Install an old version of teddy
    spawnSync(npmName, ['install', 'teddy@0.3.0'], { cwd: appDir })

    // rewrite the package.json file reflecting the newer version of teddy
    fse.writeFileSync(path.join(appDir, 'package.json'), packageJSONSource)

    // fork the auditor and run it as a child process
    const testApp = fork(path.join(appDir, '../../../lib/scripts/configAuditor.js'), [], { cwd: appDir, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the error stream, check for missing dependency output
    testApp.stderr.on('data', data => {
      if (data.includes('Missing Dependency')) {
        missingOrOODPackageBool = true
      }
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(missingOrOODPackageBool, true, 'Roosevelt did not report that there are some missing or out of date packages in the app Directory')
      done()
    })
  })
})
