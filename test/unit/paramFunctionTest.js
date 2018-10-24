/* eslint-env mocha */

const assert = require('assert')
const cleanupTestApp = require('../util/cleanupTestApp')
const { fork } = require('child_process')
const fse = require('fs-extra')
const generateTestApp = require('../util/generateTestApp')
const path = require('path')
const request = require('supertest')

describe('Parameter Function Tests', function () {
  // path to the app Directory
  const appDir = path.join(__dirname, '../app/paramFunctionTest')

  // specify the options that will be passed to the generateTestApp
  let options = { rooseveltPath: '../../../roosevelt', method: 'startServer', stopServer: true }

  beforeEach(function (done) {
    // start by copying the alreadly made mvc directory into the app directory
    fse.copySync(path.join(__dirname, '../util/mvc'), path.join(appDir, 'mvc'))
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
      onServerInit: `(app) => {process.send("something")}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      onReqStart: `(req, res, next) => {console.log("body: " + JSON.stringify(req.body)); next()}`,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      onReqBeforeRoute: `(req, res, next) => {console.log("body: " + JSON.stringify(req.body)); next()}`,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      onReqAfterRoute: `(req, res) => {console.log("Testing after: " + res.Testing)}`,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
            testApp.send('stop')
          }
          setTimeout(() => {
            testApp.send('stop')
          }, 1000)
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
    let publicFolderPath = path.join(appDir, 'public')
    fse.mkdirSync(publicFolderPath)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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

  it('should not be using Multipart middleware if the param is set to false', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      multipart: false,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app is finished initialization, post a request with some files, should get back a 500
    testApp.on('message', (params) => {
      request(`http://localhost:${params.port}`)
        .post('/simpleMultipart')
        .attach('test1', path.join(appDir, '../../util/text1.txt'))
        .expect(500, (err, res) => {
          if (err) {
            assert.fail(err)
            testApp.send('stop')
          }
          testApp.send('stop')
        })
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should not make a folder that has the version number if one exists', function (done) {
    // bool var to hold whether or not the version public folder was made or not
    let versionPublicCreationLogBool = false
    // package.json source code
    let packageSource = `{ "version": "0.5.1", "rooseveltConfig": {}}`
    // create the package.json file
    fse.writeFileSync(path.join(appDir, 'package.json'), packageSource)
    // create the version public folder
    let Dirpath1 = path.join(appDir, 'public')
    fse.mkdirSync(Dirpath1)
    let Dirpath2 = path.join(Dirpath1, '0.5.1')
    fse.mkdirSync(Dirpath2)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      versionedPublic: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
    let packageSource = `{ "version": "0.5.1", "rooseveltConfig": {}}`
    // create the package.json file
    fse.writeFileSync(path.join(appDir, 'package.json'), packageSource)

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: false,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      versionedPublic: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app console logs, see if the specific creation log was made
    testApp.stdout.on('data', (data) => {
      if (data.includes(`making new directory ${path.join(appDir, 'public/0.5.1')}`)) {
        versionPublicCreationLogBool = true
      }
    })

    // when the app finishes initialization, see if a folder like that exists
    testApp.on('message', () => {
      let test = fse.existsSync(path.join(appDir, 'public/0.5.1'))
      assert.strictEqual(test, false, 'Roosevelt made the version public folder even though generateFolderStrucutre is false')
      testApp.send('stop')
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
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
    let staticsPath = path.join(appDir, 'statics')
    fse.mkdirSync(staticsPath)
    let buildPath = path.join(staticsPath, '.build')
    fse.mkdirSync(buildPath)
    let cssPath = path.join(buildPath, 'css')
    fse.mkdirSync(cssPath)
    let jsPath = path.join(buildPath, 'js')
    fse.mkdirSync(jsPath)
    let imagesPath = path.join(staticsPath, 'images')
    fse.mkdirSync(imagesPath)

    // create the symlinks
    let publicPath = path.join(appDir, 'public')
    fse.mkdirSync(publicPath)
    fse.symlinkSync(imagesPath, path.join(publicPath, 'images'), 'junction')
    fse.symlinkSync(cssPath, path.join(publicPath, 'css'), 'junction')
    fse.symlinkSync(jsPath, path.join(publicPath, 'js'), 'junction')

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
    let controllerErrorLogBool1 = false
    let controllerErrorLogBool2 = false

    // put the err Controller into the mvc
    fse.copyFileSync(path.join(appDir, '../../util/errController.js'), path.join(appDir, 'mvc/controllers/errController.js'))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // listen to the error logs and see if one about the night being dark and full of error pops up
    testApp.stderr.on('data', (data) => {
      if (data.includes('The night is dark and full of errors!')) {
        controllerErrorLogBool1 = true
      }
      if (data.includes('failed to load controller file')) {
        controllerErrorLogBool2 = true
      }
    })

    // when the app finishes its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is about to exit, check to see if the two error logs were outputted
    testApp.on('exit', () => {
      assert.strictEqual(controllerErrorLogBool1, true, 'Roosevelt did not toss custom Error to mark that a controller has syntax errors with it')
      assert.strictEqual(controllerErrorLogBool2, true, 'Roosevelt did not toss a comment to show which controller is wrong')
      done()
    })
  })

  it('should throw an error if there is a syntax error with the 404 custom error page that is passed in', function (done) {
    // bool var to hold whether or not the 404 load error was logged
    let error404LoadLogBool = false

    // copy the 404 error page to the mvc
    fse.copyFileSync(path.join(appDir, '../../util/404errController.js'), path.join(appDir, 'mvc/controllers/404errController.js'))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      error404: '404errController.js'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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
    // bool var to see if an error show up
    let errorLoggedBool = false

    // copy the mvc over to the app
    fse.copySync(path.join(appDir, '../../util/mvc'), path.join(appDir, 'mvc'))

    // make a directory in the mvc
    fse.mkdirSync(path.join(appDir, 'mvc/controllers/test'))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      checkDependencies: false
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    testApp.stderr.on('data', (data) => {
      errorLoggedBool = true
    })

    // when the app is finished with its initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // when the app is going to exit, check to see if an error was thrown thru the entire process
    testApp.on('exit', () => {
      assert.strictEqual(errorLoggedBool, false, 'An error has occur with the feature of skipping over files in the controllers directory that are not files')
      done()
    })
  })

  it('should not add a value of css to symlink array if one exist in the array alreadly', function (done) {
    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      staticsSymlinksToPublic: ['images', 'js', 'css']
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app finishes initialization, test that there isn't a value of css as the first element in the symlink array
    testApp.on('message', (params) => {
      let firstElement = params.staticsSymlinksToPublic[0]
      let test = firstElement === 'css'
      assert.strictEqual(test, false, 'Roosevelt made a css value in the symlink array even though it alreadly has ')
      testApp.send('stop')
    })

    // when the child process exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })

  it('should only give the quirky error log back once if there are more then one broken controllers', function (done) {
    // put in the two syntax error controllers
    fse.copyFileSync(path.join(appDir, '../../util/errController.js'), path.join(appDir, 'mvc/controllers/errController.js'))
    fse.copyFileSync(path.join(appDir, '../../util/errController2.js'), path.join(appDir, 'mvc/controllers/errController2.js'))

    // num var to hold how many times the quirky error is outputted
    let gameOfThronesErrorNum = 0

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app logs, see if the quirky error is given and keep count
    testApp.stderr.on('data', (data) => {
      if (data.includes('The night is dark and full of errors!')) {
        gameOfThronesErrorNum++
      }
    })

    // once the app finishes initialization, kill it
    testApp.on('message', () => {
      testApp.send('stop')
    })

    // once the app is about to finish, check the amount of times the quote has been used
    testApp.on('exit', () => {
      assert.strictEqual(gameOfThronesErrorNum, 1, 'Roosevelt had thrown the Game of Thrones error more than once')
      done()
    })
  })

  it('should throw, catch and display an error if the controllersPath passed to roosevelt is not a dictionary', function (done) {
    // bool var to hold whether or not a specific error log was outputted
    let loadControllerFilesFailBool = false

    // copy over an existing file over to the test app directory
    fse.ensureDirSync(appDir)
    fse.copyFileSync(path.join(appDir, '../../util/faviconTest.ico'), path.join(appDir, 'mvc/faviconTest.ico'))

    // create the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      controllersPath: 'mvc/faviconTest.ico',
      onServerStart: `(app) => {process.send(app.get("params"))}`
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

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

  it('can change the nodeEnv to be something that is not development or production', function (done) {
    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      onServerStart: `(app) => {process.send(app.get("params"))}`,
      nodeEnv: 'something'
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), { 'stdio': ['pipe', 'pipe', 'pipe', 'ipc'] })

    // when the app finishes initialization, check that the nodeEnv of the app stayed the same as the one passed in and that it is not prod or dev
    testApp.on('message', (params) => {
      assert.strictEqual(params.nodeEnv, 'something', 'Roosevelt did not keep the node Env string that was passed in as a param')
      testApp.send('stop')
    })

    // when the app exits, finish the test
    testApp.on('exit', () => {
      done()
    })
  })
})
