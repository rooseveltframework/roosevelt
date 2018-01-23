/* eslint-env mocha */

const assert = require('assert')
const path = require('path')
const generateTestApp = require('../util/generateTestApp')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const fs = require('fs')
const fse = require('fs-extra')
const klawsync = require('klaw-sync')

// appDir
const appDir = path.join(__dirname, '../', 'app', 'cssTest')

// basic CSS files
let cssDataArray = [
  `body { 
    height: 100%;
  } 
  h1 {
    font-size: 10px;
  }`,
  `#selector { 
    height: 100%;
  } 
  h1 {
    font-size: 10px;
  }`,
  `.body { 
    height: 100%;
  } 
  h1 {
    font-size: 10px;
  }`
]

// path to CSS static files
let pathOfCSSStaticFilesArray = [
  path.join(appDir, 'statics', 'css', 'a.css'),
  path.join(appDir, 'statics', 'css', 'b.css'),
  path.join(appDir, 'statics', 'css', 'c.css')
]

// path to CSS compiled files
let pathOfCSSCompiledfilesArray = [
  path.join(appDir, 'statics', '.build', 'css', 'a.css'),
  path.join(appDir, 'statics', '.build', 'css', 'b.css'),
  path.join(appDir, 'statics', '.build', 'css', 'c.css')
]

// function to generate the static files before each test
const generateStaticFolder = () => {
  // generate the folder for the static stuff first
  fse.ensureDirSync(path.join(appDir, 'statics', 'css'))
  // loop through the cssDataArry and write to each files in the paths of CSS Static Array
  for (let x = 0; x < cssDataArray.length; x++) {
    fs.writeFileSync(pathOfCSSStaticFilesArray[x], cssDataArray[x])
  }
}

describe('CSS Section Tests', function () {
// 1. Test to see that it compiles -check
// 2. Test to see the whitelist compiles -check
// 3. Test to see that changing the output name would in fact change the build output name and put compiled files in it -check
// 4. Test to see if versionFile, if given a object, makes a versionFile CSS file - it exist, but version is not listed

  // clean up the old test after completion
  afterEach(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should compile the static CSS files using roosevelt-less', function (done) {
    // generate the static files and folder
    generateStaticFolder()
    // generate the app
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      },
      generateFolderStructure: true,
      suppressLogs: {
        httpLogs: true,
        rooseveltLogs: false,
        rooseveltWarnings: false
      }
    }, 'initServer')

    // fork the app
    const testApp = fork(path.join(appDir, 'app.js'), ['-p'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message being sent back from the initialized app, test to see that they are there
    testApp.on('message', () => {
      // look for the folder
      let pathToCompiledFolder = path.join(appDir, 'statics', '.build', 'css')
      let cssCompiledArray = klawsync(pathToCompiledFolder)
      // look at each file and see that it checks out with the test array
      cssCompiledArray.forEach((file) => {
        let test = pathOfCSSCompiledfilesArray.includes(file.path)
        assert.equal(test, true)
      })
      // kill the app and say the test is done afterwards
      testApp.kill()
      done()
    })
  })

  it('should only compiled the files that are whitelisted', function (done) {
    // generate the static files and folder
    generateStaticFolder()

    // make a test array for whitelisted files
    const pathOfWhiteListedArray = [
      path.join(appDir, 'statics', '.build', 'css', 'b.css'),
      path.join(appDir, 'statics', '.build', 'css', 'c.css')
    ]

    // generate the app
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        whitelist: ['b.css', 'c.css']
      },
      generateFolderStructure: true,
      suppressLogs: {
        httpLogs: true,
        rooseveltLogs: false,
        rooseveltWarnings: false
      }
    }, 'initServer')

    // fork the app
    const testApp = fork(path.join(appDir, 'app.js'), ['-p'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the message being sent back from the initialized app, test to see that the whitelist files were compiled
    testApp.on('message', () => {
      // look for the folder
      let pathToCompiledFolder = path.join(appDir, 'statics', '.build', 'css')
      let cssCompiledArray = klawsync(pathToCompiledFolder)
      // look at each file and see that it checks out with the test array
      cssCompiledArray.forEach((file) => {
        let test = pathOfWhiteListedArray.includes(file.path)
        assert.equal(test, true)
      })
      // kill the app and say the test is done afterwards
      testApp.kill()
      done()
    })
  })

  it('should rename the compiled output file to what is on the output parameter', function (done) {
    // Generate the static files and folder
    generateStaticFolder()

    // change the compiled path array to reflect the changed file name
    pathOfCSSCompiledfilesArray = [
      path.join(appDir, 'statics', '.build', 'cssCompiledTest', 'a.css'),
      path.join(appDir, 'statics', '.build', 'cssCompiledTest', 'b.css'),
      path.join(appDir, 'statics', '.build', 'cssCompiledTest', 'c.css')
    ]

    // generate the app
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        output: '.build/cssCompiledTest'
      },
      generateFolderStructure: true,
      suppressLogs: {
        httpLogs: true,
        rooseveltLogs: false,
        rooseveltWarnings: false
      }
    }, 'initServer')

    // fork the app
    const testApp = fork(path.join(appDir, 'app.js'), ['-p'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the server is initialized, look to see if the folder exist and if the files are there
    testApp.on('message', () => {
      let pathOfCSSCompiledFolder = path.join(appDir, 'statics', '.build', 'cssCompiledTest')
      let cssCompiledArray = klawsync(pathOfCSSCompiledFolder)
      // go through each file to see if their pathname matches with the changed array above and that there are no extras
      cssCompiledArray.forEach((file) => {
        let test = pathOfCSSCompiledfilesArray.includes(file.path)
        assert.equal(test, true)
      })
      // kill and finish the test
      testApp.kill()
      done()
    })
  })

  it('make a CSS file that declares a CSS varaible that contains the app Version number from package.js', function (done) {
    // generate the app
    generateTestApp({
      appDir: appDir,
      css: {
        compiler: {
          nodeModule: 'roosevelt-less',
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        },
        versionFile: {
          fileName: '_version.less',
          varName: 'appVersion'
        }
      },
      generateFolderStructure: true,
      suppressLogs: {
        httpLogs: true,
        rooseveltLogs: false,
        rooseveltWarnings: false
      }
    }, 'initServer')

    // fork the app
    const testApp = fork(path.join(appDir, 'app.js'), ['-p'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // wait for the app to be finished initialized
    testApp.on('message', () => {
      // see if the file exist inside the css folder
      let versionFilePath = path.join(appDir, 'statics', 'css', '_version.less')
      let test = fs.existsSync(versionFilePath)
      assert.equal(test, true)
      testApp.kill()
      done()
    })
  })
})
