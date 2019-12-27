/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('./util/cleanupTestApp')
const { fork } = require('child_process')
const fs = require('fs-extra')
const generateTestApp = require('./util/generateTestApp')
const path = require('path')
const request = require('supertest')

describe('Parameter Function Tests', function () {
  // path to the app Directory
  const appDir = path.join(__dirname, 'app/paramFunctionTest')

  // specify the options that will be passed to the generateTestApp
  const options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  beforeEach(function (done) {
    // start by copying the alreadly made mvc directory into the app directory
    fs.copySync(path.join(__dirname, 'util/mvc'), path.join(appDir, 'mvc'))
    done()
  })

  // delete the test app Directory and start with a clean state after each test
  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should execute what is in onServerInit', function (done) {
    // bool vars to hold whether or not the app had returned what is given to them, and if we can access the server
    let serverInitLogBool = false
    let messageCounter = 0
    // change what options method is for this test
    options.method = 'initServer'

    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerInit: '(app) => {process.send("something")}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the server has finished initialization, try to access the server or see if the message is the word that is suppose to be given back
    testApp.on('message', (message) => {
      messageCounter++
      if (message === 'something') {
        serverInitLogBool = true
      }
      if (messageCounter === 2) {
        testApp.send('stop')
      }
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(serverInitLogBool, true, 'Roosevelt did not execute what is in onServerInit')
      done()
    })
  })

  it('should execute what is in onReqStart', function (done) {
    // bool var to hold whether or not the app had used its body parser middleware yet
    let bodyParserNotUsedBool = false

    // make options method go back to what it once was
    options.method = 'startServer'

    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onReqStart: '(req, res, next) => {console.log("body: " + JSON.stringify(req.body)); next()}',
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the console logs to see if the req body that will be logged out has a value or if its undefined
    testApp.stdout.on('data', (data) => {
      if (data.includes('body: undefined')) {
        bodyParserNotUsedBool = true
      }
    })

    // when the app starts and sends the message that "ServerStart", send a request and see if I get another message saying "ReqStart"
    testApp.on('message', (params) => {
      // send a http request
      request(`http://localhost:${params.port}`)
        .post('/paramPost')
        .send({ name: 'Bob' })
        .send({ age: '3' })
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          testApp.send('stop')
        })
    })

    // when the app is about to exit, check if the bool is true
    testApp.on('exit', () => {
      assert.strictEqual(bodyParserNotUsedBool, true, 'The Response that we got back from onReqStart shows that middleware was used before it was hit')
      done()
    })
  })

  it('should execute what is in onReqBeforeRoute', function (done) {
    // bool var to hold whether or not the app had used its body parser middleware yet
    let bodyParserUsedBool = false

    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onReqBeforeRoute: '(req, res, next) => {console.log("body: " + JSON.stringify(req.body)); next()}',
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the console logs to see if the req body that will be logged out has a value or if its undefined
    testApp.stdout.on('data', (data) => {
      if (data.includes('body: {"name":"Bob","age":"3"}')) {
        bodyParserUsedBool = true
      }
    })

    testApp.on('message', (params) => {
      // send a http request
      request(`http://localhost:${params.port}`)
        .post('/paramPost')
        .send({ name: 'Bob' })
        .send({ age: '3' })
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          testApp.send('stop')
        })
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(bodyParserUsedBool, true, 'The Response that we got back from onReqStart shows that middleware was not used before it was hit')
      done()
    })
  })

  it('should execute what is in onReqAfterRoute', function (done) {
    // two bool to check if res.text has a value in it
    let resHeaderUndefinedBool = false
    let resHeaderValueBool = false

    // generate the app
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onReqAfterRoute: '(req, res) => {console.log("Testing after: " + res.Testing)}',
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (data) => {
      if (data.includes('Testing before: undefined')) {
        resHeaderUndefinedBool = true
      }
      if (data.includes('Testing after: someValue')) {
        resHeaderValueBool = true
      }
    })

    testApp.on('message', (params) => {
      // send a http request
      request(`http://localhost:${params.port}`)
        .get('/paramPostAfter')
        .accept('application/json')
        .expect(200, (err, res) => {
          if (err) {
            assert.fail(err)
          }
          testApp.send('stop')
        })
    })

    // when the app is about to exit, check if both bool values are true
    testApp.on('exit', () => {
      assert.strictEqual(resHeaderUndefinedBool, true, 'response header should have no value as it was not assigned yet')
      assert.strictEqual(resHeaderValueBool, true, 'response heade should have a value since it was assigned in route')
      done()
    })
  })

  it('should not make a public directory if one exists', function (done) {
    // bool var to see if the Roosevelt making the public dir is logged
    let publicDirCreationLogBool = false

    // create a public dir
    const publicFolderPath = path.join(appDir, 'public')
    fs.mkdirSync(publicFolderPath)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app logs, see if the specific log is outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'public')}`)) {
        publicDirCreationLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to exit, check if the specific log was outputted
    testApp.on('exit', () => {
      assert.strictEqual(publicDirCreationLogBool, false, 'Roosevelt made a public Directory even though one exists alreadly')
      done()
    })
  })

  it('should not make a public directory if generateFolderStructure is false', function (done) {
    // bool var to see if the Roosevelt making the public dir is logged
    let publicDirCreationLogBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app logs, see if the specific log is outputted
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'public')}`)) {
        publicDirCreationLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to exit, check if the specific log was outputted
    testApp.on('exit', () => {
      assert.strictEqual(publicDirCreationLogBool, false, 'Roosevelt made a public Directory even though one exists alreadly')
      done()
    })
  })

  it('should not make a folder that has the version number if one exists', function (done) {
    // bool var to hold whether or not the version public folder was made or not
    let versionPublicCreationLogBool = false
    // package.json source code
    const packageSource = '{ "version": "0.5.1", "rooseveltConfig": {}}'
    // create the package.json file
    fs.writeFileSync(path.join(appDir, 'package.json'), packageSource)
    // create the version public folder
    const Dirpath1 = path.join(appDir, 'public')
    fs.mkdirSync(Dirpath1)
    const Dirpath2 = path.join(Dirpath1, '0.5.1')
    fs.mkdirSync(Dirpath2)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: '(app) => {process.send(app.get("params"))}',
      versionedPublic: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app console logs, see if the specific creation log was made
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'public', '0.5.1')}`)) {
        versionPublicCreationLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to exit, check to see if the version public folder log was outputted
    testApp.on('exit', () => {
      assert.strictEqual(versionPublicCreationLogBool, false, 'Roosevelt create a new version public folder even thought one existed')
      done()
    })
  })

  it('should not make a public version folder if generateFolderStructure is false', function (done) {
    // bool var to hold whether or not the version public folder was made or not
    let versionPublicCreationLogBool = false
    // package.json source code
    const packageSource = '{ "version": "0.5.1", "rooseveltConfig": {}}'
    // create the package.json file
    fs.writeFileSync(path.join(appDir, 'package.json'), packageSource)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      onServerStart: '(app) => {process.send(app.get("params"))}',
      versionedPublic: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app console logs, see if the specific creation log was made
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'public/0.5.1')}`)) {
        versionPublicCreationLogBool = true
      }
    })

    // when the app finishes initialization, see if a folder like that exists
    testApp.on('message', () => {
      testApp.send('stop')
      const test = fs.existsSync(path.join(appDir, 'public/0.5.1'))
      assert.strictEqual(test, false, 'Roosevelt made the version public folder even though generateFolderStrucutre is false')
    })

    // when the app is about to exit, check if the specific log was made
    testApp.on('exit', () => {
      assert.strictEqual(versionPublicCreationLogBool, false, 'Roosevelt made the version public folder even though generateFolderStrucutre is false')
      done()
    })
  })

  it('should not make a models Directory again if generateFolderStructure is false', function (done) {
    // bool to hold whether or not the view Directory creation log was given
    let modelDirectoryCreationLogBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'mvc/models')}`)) {
        modelDirectoryCreationLogBool = true
      }
    })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(modelDirectoryCreationLogBool, false, 'Roosevelt created a models folder even though generateFolderStrucutre is false')
      done()
    })
  })

  it('should not make a views Directory again if generateFolderStructure is false', function (done) {
    // bool to hold whether or not the view Directory creation log was given
    let viewsDirectoryCreationLogBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'mvc/views')}`)) {
        viewsDirectoryCreationLogBool = true
      }
    })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    testApp.on('exit', () => {
      assert.strictEqual(viewsDirectoryCreationLogBool, false, 'Roosevelt created a views folder even though generateFolderStrucutre is false')
      done()
    })
  })

  it('should not make a controllers Directory again if generateFolderStructure is false', function (done) {
    // bool to hold whether or not the view Directory creation log was given
    let controllersDirectoryCreationLogBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'mvc/controllers')}`)) {
        controllersDirectoryCreationLogBool = true
      }
    })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(controllersDirectoryCreationLogBool, false, 'Roosevelt created a controllers folder even though generateFolderStrucutre is false')
      done()
    })
  })

  it('should not make symlinks if they already exists in the app directory', function (done) {
    // bool var to hold whether or not the symlink creation log was outputted
    let symlinkCreationLogBool = false

    // create the other directories first
    const staticsPath = path.join(appDir, 'statics')
    fs.mkdirSync(staticsPath)
    const buildPath = path.join(staticsPath, '.build')
    fs.mkdirSync(buildPath)
    const cssPath = path.join(buildPath, 'css')
    fs.mkdirSync(cssPath)
    const jsPath = path.join(buildPath, 'js')
    fs.mkdirSync(jsPath)
    const imagesPath = path.join(staticsPath, 'images')
    fs.mkdirSync(imagesPath)

    // create the symlinks
    const publicPath = path.join(appDir, 'public')
    fs.mkdirSync(publicPath)
    fs.symlinkSync(imagesPath, path.join(publicPath, 'images'), 'junction')
    fs.symlinkSync(cssPath, path.join(publicPath, 'css'), 'junction')
    fs.symlinkSync(jsPath, path.join(publicPath, 'js'), 'junction')

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // listen to the logs and see if any of the symlinks creations were logged
    testApp.stdout.on('data', (data) => {
      if (data.includes('making new symlink')) {
        symlinkCreationLogBool = true
      }
    })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is exiting, see if the log was outputted
    testApp.on('exit', () => {
      assert.strictEqual(symlinkCreationLogBool, false, 'Roosevelt made symlinks even though they already exists in the app Directory')
      done()
    })
  })

  it('should throw an error if there is a controller that is not coded properly in the mvc', function (done) {
    // bool var to hold whether or not the controller errors logs are outputted
    let controllerErrorLogBool = false

    // put the err Controller into the mvc
    fs.copyFileSync(path.join(appDir, '../.././util/errController.js'), path.join(appDir, 'mvc/controllers/errController.js'))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // listen to the error logs and see if one about the night being dark and full of error pops up
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to load controller file')) {
        controllerErrorLogBool = true
      }
    })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to exit, check to see if the two error logs were outputted
    testApp.on('exit', () => {
      assert.strictEqual(controllerErrorLogBool, true, 'Roosevelt did not toss a comment to show which controller is wrong')
      done()
    })
  })

  it('should throw an error if there is a syntax error with the 404 custom error page that is passed in', function (done) {
    // bool var to hold whether or not the 404 load error was logged
    let error404LoadLogBool = false

    // copy the 404 error page to the mvc
    fs.copyFileSync(path.join(appDir, '../.././util/404errController.js'), path.join(appDir, 'mvc/controllers/404errController.js'))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: '(app) => {process.send(app.get("params"))}',
      errorPages: {
        notFound: '404errController.js'
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the error logs to see if the 404 load error was outputted
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to load 404 controller file')) {
        error404LoadLogBool = true
      }
    })

    // when the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to exit, check to see if the 404 load errors were logged
    testApp.on('exit', () => {
      assert.strictEqual(error404LoadLogBool, true, 'Roosevelt did not toss an error when there is a syntax error with the custom 404 controller file')
      done()
    })
  })

  it('should skip over elements that are not files when loading in controllers', function (done) {
    // reference list of routes to compare against
    const referenceRoutes = [
      '/controller1',
      '/controller2'
    ]

    // copy the mvc over to the app
    fs.copySync(path.join(appDir, '../.././util/mvc'), path.join(appDir, 'mvc'))

    // make a directory in the mvc
    fs.mkdirSync(path.join(appDir, 'mvc/controllers/test'))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: '(app) => {process.send(app.get("routes"))}',
      checkDependencies: false
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app is finished with its initialization, kill it
    testApp.on('message', (routes) => {
      // check that routes in controllers have been populated in the app
      assert(routes.length > 0)

      // check app's routes against reference list
      referenceRoutes.forEach(route => {
        assert(routes.includes(route))
      })

      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should not add a value of css to symlink array if one exist in the array alreadly', function (done) {
    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: '(app) => {process.send(app.get("params"))}',
      staticsSymlinksToPublic: ['images', 'js', 'css']
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app finishes initialization, test that there isn't a value of css as the first element in the symlink array
    testApp.on('message', (params) => {
      const firstElement = params.staticsSymlinksToPublic[0]
      const test = firstElement === 'css'
      assert.strictEqual(test, false, 'Roosevelt made a css value in the symlink array even though it alreadly has ')
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should display an error if trying to make a symlink as a subdirectory of another symlink', function (done) {
    // bool var to hold whether or not the symlink error was logged
    let symlinkErrBool = false

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      alwaysHostPublic: true,
      onServerStart: '(app) => {process.send(app.get("params"))}',
      staticsSymlinksToPublic: ['symDir: staticsDir', 'symDir/subSymDir: otherStaticsDir']
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // check the error logs to see if the symlink error was outputted
    testApp.stderr.on('data', (data) => {
      if (data.includes('Symlink failed! Cannot make')) {
        symlinkErrBool = true
      }
    })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is exiting, see if the error was outputted
    testApp.on('exit', () => {
      assert.strictEqual(symlinkErrBool, true, 'Roosevelt did not log an error when trying to make a symlink as a subdirectory of another symlink')
      done()
    })
  })

  it('should be able to symlink to directories ', function (done) {
    // prepare paths to folders
    const publicPath = path.join(appDir, 'public')
    const parentDirPath = path.join(publicPath, 'parentDir')
    const symDirPath = path.join(parentDirPath, 'symDir')

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      alwaysHostPublic: true,
      onServerStart: '(app) => {process.send(app.get("params"))}',
      staticsSymlinksToPublic: ['parentDir/symDir']
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is exiting, check if the parent directory and the symlink subdirectory were created successfully
    testApp.on('exit', () => {
      fs.lstat(parentDirPath, (err, stats) => {
        if (err) {
          done(err)
        } else {
          assert.strictEqual(stats.isDirectory(), true, 'parent directory of symlink not created successfully')
        }
      })
      fs.lstat(symDirPath, (err, stats) => {
        if (err) {
          done(err)
        } else {
          assert.strictEqual(stats.isSymbolicLink(), true, 'symlink to directory not created successfully')
        }
      })
      done()
    })
  })

  it('should throw, catch and display an error if the controllersPath passed to roosevelt is not a dictionary', function (done) {
    // bool var to hold whether or not a specific error log was outputted
    let loadControllerFilesFailBool = false

    // copy over an existing file over to the test app directory
    fs.ensureDirSync(appDir)
    fs.copyFileSync(path.join(appDir, '../.././util/faviconTest.ico'), path.join(appDir, 'mvc/faviconTest.ico'))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      controllersPath: 'mvc/faviconTest.ico',
      onServerStart: '(app) => {process.send(app.get("params"))}'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stderr.on('data', (data) => {
      if (data.includes('Roosevelt Express fatal error: could not load controller files from')) {
        loadControllerFilesFailBool = true
      }
    })

    testApp.on('message', (params) => {
      testApp.send('stop')
    })

    // when the child process exits, check assertions and finish the test
    testApp.on('exit', () => {
      assert.strictEqual(loadControllerFilesFailBool, true, 'Roosevelt did not throw an error on how the controllersPath is not a path to a directory')
      done()
    })
  })
})
