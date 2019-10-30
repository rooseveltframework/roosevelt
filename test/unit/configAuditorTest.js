/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const configAuditor = require('../../lib/scripts/configAuditor')
const { fork } = require('child_process')
const fs = require('fs-extra')
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
    // grab the contents of the default config file
    const defaultContent = JSON.parse(fs.readFileSync(path.join(__dirname, '../../lib/defaults/config.json')).toString('utf8'))
    // grab the content of the script file
    const scriptContent = JSON.parse(fs.readFileSync(path.join(__dirname, '../../lib/defaults/scripts.json')).toString('utf8'))
    // add the defaultContent to packageJSONSource
    packageJSONSource.rooseveltConfig = defaultContent
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
    fs.ensureDirSync(path.join(appDir))
    delete packageJSONSource.rooseveltConfig.modelsPath
    delete packageJSONSource.rooseveltConfig.viewsPath
    delete packageJSONSource.rooseveltConfig.controllersPath
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

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
      if (data.includes('Missing param "modelsPath"!')) {
        modelsPathMissingBool = true
      }
      if (data.includes('Missing param "viewsPath"!')) {
        viewsPathMissingBool = true
      }
      if (data.includes('Missing param "controllersPath"!')) {
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
    const errors = []

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
    fs.ensureDirSync(appDir)
    // add the package.json file to the appDir folder
    delete packageJSONSource.rooseveltConfig.modelsPath
    delete packageJSONSource.rooseveltConfig.viewsPath
    delete packageJSONSource.rooseveltConfig.controllersPath
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // use the configAuditor's audit method
    configAuditor.audit(appDir)

    // unhook stdout/stderr
    unhookStdout()
    unhookStderr()

    const test1 = logs[0].includes('Starting rooseveltConfig audit...')
    const test2 = errors[0].includes('Missing param "modelsPath"!')
    const test3 = errors[1].includes('Missing param "viewsPath"!')
    const test4 = errors[2].includes('Missing param "controllersPath"!')
    const test5 = errors[3].includes('Issues have been detected in rooseveltConfig')
    const test6 = errors[4].includes('for the latest sample rooseveltConfig.')
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
    fs.ensureDirSync(appDir)
    delete packageJSONSource.rooseveltConfig.modelsPath
    delete packageJSONSource.rooseveltConfig.viewsPath
    delete packageJSONSource.rooseveltConfig.controllersPath
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // fork the configAuditor.js file and run it as a child process
    const testApp = fork(path.join(appDir, '../../../lib/scripts/configAuditor.js'), [], { cwd: appDir, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
    })

    testApp.stderr.on('data', (data) => {
      if (data.includes('Missing param "modelsPath"!')) {
        modelsPathMissingBool = true
      }
      if (data.includes('Missing param "viewsPath"!')) {
        viewsPathMissingBool = true
      }
      if (data.includes('Missing param "controllersPath"!')) {
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
    fs.ensureDirSync(appDir)
    delete packageJSONSource.rooseveltConfig.modelsPath
    delete packageJSONSource.rooseveltConfig.viewsPath
    delete packageJSONSource.rooseveltConfig.controllersPath
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // create a public folder inside the app Directory
    fs.ensureDir(path.join(appDir, 'public'))

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
      assert.strictEqual(startingConfigAuditBool, false, 'Roosevelt should not have started the config auditor when app already has a public folder in the app directory')
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
    fs.ensureDirSync(appDir)
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

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
    fs.ensureDirSync(appDir)
    delete packageJSONSource.rooseveltConfig.htmlValidator.enable
    delete packageJSONSource.rooseveltConfig.css.whitelist
    packageJSONSource.rooseveltConfig.js.warnings = true
    delete packageJSONSource.rooseveltConfig.js.compiler
    delete packageJSONSource.rooseveltConfig.js.whitelist
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // generate the test app
    generateTestApp({
      appDir: appDir,
      onServerStart: '(app) => {process.send("something")}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the error strean, check the console output for missing parameters
    testApp.stderr.on('data', (data) => {
      if (data.includes('Missing param "enable" in "htmlValidator"!')) {
        missingEnableBool = true
      }
      if (data.includes('Missing param "whitelist" in "css"!')) {
        missingWhiteListCSSBool = true
      }
      if (data.includes('Extra param "warnings" found in "js", this can be removed.')) {
        extraWarningsJSBool = true
      }
      if (data.includes('Missing param "compiler" in "js"!')) {
        missingCompilerJSBool = true
      }
      if (data.includes('Missing param "whitelist" in "js"!')) {
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
    fs.ensureDirSync(appDir)
    packageJSONSource.rooseveltConfig.turbo = true
    packageJSONSource.rooseveltConfig.maxServers = 4
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

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
      if (data.includes('Extra param "turbo" found, this can be removed.')) {
        extraTurboParamBool = true
      }
      if (data.includes('Extra param "maxServers" found, this can be removed.')) {
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

  it('should not report that there are extra params if _roosevelt-extra-exempt is set to true', function (done) {
    // bool var to hold whether or not the correct logs are being outputted
    let extraParamBool = false
    let errorBool = false
    let startingConfigAuditBool = false

    // generate the package.json file
    fs.ensureDirSync(appDir)
    packageJSONSource.rooseveltConfig.logging.extraParam = true
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

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
      if (data.includes('Extra param "extraParam" found')) {
        extraParamBool = true
      }
      if (data.includes('Issues have been detected in rooseveltConfig')) {
        errorBool = true
      }
    })

    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the config Auditor')
      assert.strictEqual(extraParamBool, false, 'configAuditor should not have warned about the extra param in the roosevelt config')
      assert.strictEqual(errorBool, false, 'configAuditor should not have reported issues with the roosevelt config')
      done()
    })
  })

  it('should not report that there are missing params if _roosevelt-missing-exempt is set to true', function (done) {
    // bool var to hold whether or not the correct logs are being outputted
    let missingParamBool = false
    let errorBool = false
    let startingConfigAuditBool = false

    // generate the package.json file
    fs.ensureDirSync(appDir)
    delete packageJSONSource.rooseveltConfig.multipart.multiples
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

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
      if (data.includes('Missing param "multiples"')) {
        missingParamBool = true
      }
      if (data.includes('Issues have been detected in rooseveltConfig')) {
        errorBool = true
      }
    })

    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the config Auditor')
      assert.strictEqual(missingParamBool, false, 'configAuditor should not have warned about a missing param in the roosevelt config')
      assert.strictEqual(errorBool, false, 'configAuditor should not have reported issues with the roosevelt config')
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
    fs.ensureDirSync(appDir)
    packageJSONSource.scripts.clean = 'node ./node_modules/roosevelt/is_not_correct.js'
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

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

  it('should report that no errors have been found after running the config auditor', function (done) {
    // bool var to hold whether or not the right logs were outputted
    let startingConfigAuditBool = false
    let noErrorsBool = false

    // generate the package.json file
    fs.ensureDirSync(appDir)
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // generate the test app
    generateTestApp({
      appDir: appDir,
      onServerStart: '(app) => {process.send("something")}'
    }, options)

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream, check for config auditor data
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
      if (data.includes('rooseveltConfig audit completed with no errors found.')) {
        noErrorsBool = true
      }
    })

    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the config Auditor')
      assert.strictEqual(noErrorsBool, true, 'config Auditor is reporting back that there is an error even though the package.json file does not have one')
      done()
    })
  })

  it('should not run the config Auditor if it has a cwd without a node_modules folder', function (done) {
    // bool var to hold whether or not a specific log was outputted
    let startingConfigAuditBool = false

    // create a node_modules directory in the test app
    fs.ensureDirSync(appDir)
    fs.mkdirSync(path.join(appDir, 'node_modules'))

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
    let noErrorsBool = false

    // generate the package.json file
    fs.ensureDirSync(appDir)
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // set env.INIT_CWD to the correct location
    process.env.INIT_CWD = appDir

    // create a node_modules folder
    fs.ensureDirSync(path.join(appDir, 'node_modules'))

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, '../../../lib/scripts/configAuditor.js'), [], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
      if (data.includes('rooseveltConfig audit completed with no errors found.')) {
        noErrorsBool = true
      }
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the config Auditor')
      assert.strictEqual(noErrorsBool, true, 'config Auditor is reporting back that there is an error even though the package.json file does not have one')
      done()
    })
  })

  it('should use the env var cwd if it matches the processes cwd', function (done) {
    // bool var to see if the right logs are being logged
    let startingConfigAuditBool = false
    let noErrorsBool = false

    // set env.INIT_CWD to the correct location
    process.env.INIT_CWD = appDir

    // generate the package.json file
    fs.ensureDirSync(appDir)
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSONSource))

    // fork and run app.js as a child process
    const testApp = fork(path.join(appDir, '../../../lib/scripts/configAuditor.js'), [], { cwd: appDir, stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // on the output stream
    testApp.stdout.on('data', (data) => {
      if (data.includes('Starting rooseveltConfig audit...')) {
        startingConfigAuditBool = true
      }
      if (data.includes('rooseveltConfig audit completed with no errors found.')) {
        noErrorsBool = true
      }
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(startingConfigAuditBool, true, 'Roosevelt did not start the config Auditor')
      assert.strictEqual(noErrorsBool, true, 'config Auditor is reporting back that there is an error even though the package.json file does not have one')
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
    fs.ensureDirSync(appDir)

    // Add dependencies to the packageJSONSource
    packageJSONSource.dependencies = {}
    packageJSONSource.dependencies.teddy = '~0.4.0'
    packageJSONSource.dependencies.colors = '~1.2.0'
    packageJSONSource = JSON.stringify(packageJSONSource)

    // Create the package.json file in the app test dir
    fs.writeFileSync(path.join(appDir, 'package.json'), packageJSONSource)

    // Install an old version of teddy
    spawnSync(npmName, ['install', 'teddy@0.3.0'], { cwd: appDir })

    // rewrite the package.json file reflecting the newer version of teddy
    fs.writeFileSync(path.join(appDir, 'package.json'), packageJSONSource)

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
