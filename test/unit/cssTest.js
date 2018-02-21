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

// sample CSS source string to test the compiler with
let cssDataArray = [
  `body {
  height: 100%;
}
h1 {
  font-size: 10px;
}
`,
  `#selector {
  height: 100%;
}
h1 {
  font-size: 10px;
}
`,
  `.body {
  height: 100%;
}
h1 {
  font-size: 10px;
}
`
]

// options to pass into generateTestApp
let options = {rooseveltPath: '../../../roosevelt', method: 'initServer'}

// array of paths to generated static less test files
let pathOfCSSStaticFilesArray = [
  path.join(appDir, 'statics', 'css', 'a.less'),
  path.join(appDir, 'statics', 'css', 'b.less'),
  path.join(appDir, 'statics', 'css', 'c.less')
]

// array of paths to where compiled css files should be written
let pathOfCSSCompiledfilesArray = [
  path.join(appDir, 'statics', '.build', 'css', 'a.css'),
  path.join(appDir, 'statics', '.build', 'css', 'b.css'),
  path.join(appDir, 'statics', '.build', 'css', 'c.css')
]

describe('CSS Section Tests', function () {
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

  beforeEach(function () {
    // start by generating a static folder in the roosevelt test app directory
    fse.ensureDirSync(path.join(appDir, 'statics', 'css'))
    // generate sample less files in statics by looping through sample CSS strings
    for (let x = 0; x < cssDataArray.length; x++) {
      fs.writeFileSync(pathOfCSSStaticFilesArray[x], cssDataArray[x])
    }
  })

  it('should compile the static CSS files using roosevelt-less', function (done) {
    // create the app.js file
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
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

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
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should only compiled the files that are whitelisted', function (done) {
    // array for whitelisted files
    const pathOfWhiteListedArray = [
      path.join(appDir, 'statics', '.build', 'css', 'b.css'),
      path.join(appDir, 'statics', '.build', 'css', 'c.css')
    ]

    // create the app.js file
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
        whitelist: ['b.less', 'c.less']
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

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
      testApp.kill('SIGINT')
    })
    testApp.on('exit', () => {
      done()
    })
  })

  it('should rename the compiled output file to what is on the output parameter', function (done) {
    // path to CSS custom directory compiled files
    let pathOfCSSCustomDirCompiledfilesArray = [
      path.join(appDir, 'statics', '.build', 'cssCompiledTest', 'a.css'),
      path.join(appDir, 'statics', '.build', 'cssCompiledTest', 'b.css'),
      path.join(appDir, 'statics', '.build', 'cssCompiledTest', 'c.css')
    ]

    // create the app.js file
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
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // when the server is initialized, look to see if the folder exist and if the files are there
    testApp.on('message', () => {
      let pathOfCSSCompiledFolder = path.join(appDir, 'statics', '.build', 'cssCompiledTest')
      let cssCompiledArray = klawsync(pathOfCSSCompiledFolder)
      // go through each file to see if their pathname matches with the changed array above and that there are no extras
      cssCompiledArray.forEach((file) => {
        let test = pathOfCSSCustomDirCompiledfilesArray.includes(file.path)
        assert.equal(test, true)
      })
      // kill and finish the test
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('make a CSS file that declares a CSS variable that contains the app version number from package.js', function (done) {
    // contents of sample package.json file to use for testing css versionFile
    let packageJSON = {
      version: '0.3.1',
      rooseveltConfig: {}
    }

    // generate the package json file with basic data
    fse.ensureDirSync(path.join(appDir))
    fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(packageJSON))

    // create the app.js file
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
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // wait for the app to be finished initialized
    testApp.on('message', () => {
      // see if the file exist inside the css folder
      let versionFilePath = path.join(appDir, 'statics', 'css', '_version.less')
      let test1 = fs.existsSync(versionFilePath)
      assert.equal(test1, true)
      // see that the value in the css version file is correct
      let versionFileString = fs.readFileSync(path.join(appDir, 'statics', 'css', '_version.less'), 'utf8')
      let versionFileNum = versionFileString.split(`'`)
      let test2 = packageJSON.version === versionFileNum[1]
      assert.equal(test2, true)
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should make the compiled whitelist file take the name of the delimiter that is passed into it', function (done) {
    // make an array that holds the custom directory compiled CSS file
    let pathOfCustomDirCompiledCSSArray = [
      path.join(appDir, 'statics', '.build', 'css', 'test', 'blah.css')
    ]

    // create the app.js file
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
        whitelist: ['a.less:test/blah.css']
      },
      generateFolderStructure: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // wait for a message to test if the file is in the right position
    testApp.on('message', () => {
      let pathOfCompiledDLCSS = path.join(appDir, 'statics', '.build', 'css', 'test')
      let CompiledDLCSSArray = klawsync(pathOfCompiledDLCSS)
      CompiledDLCSSArray.forEach((file) => {
        let test = pathOfCustomDirCompiledCSSArray.includes(file.path)
        assert.equal(test, true)
      })
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should copy over the CSS files to build without changing them when the noMinify param is true', function (done) {
    // grab the buffers of the static files
    let bufferOfStaticFileA = fs.readFileSync(pathOfCSSStaticFilesArray[0], 'utf8')
    let bufferOfStaticFileB = fs.readFileSync(pathOfCSSStaticFilesArray[1], 'utf8')
    let bufferOfStaticFileC = fs.readFileSync(pathOfCSSStaticFilesArray[2], 'utf8')

    // create the app.js file
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
      noMinify: true
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // listen to the message and check that the build files are the same as there static counterpart
    testApp.on('message', () => {
      // grab the buffers of the *compiled* files
      let bufferOfCompiledFileA = fs.readFileSync(pathOfCSSCompiledfilesArray[0], 'utf8')
      let bufferOfCompiledFileB = fs.readFileSync(pathOfCSSCompiledfilesArray[1], 'utf8')
      let bufferOfCompiledFileC = fs.readFileSync(pathOfCSSCompiledfilesArray[2], 'utf8')
      // make the comparisons between the files in the build and the files in the static
      let test1 = bufferOfStaticFileA === bufferOfCompiledFileA
      let test2 = bufferOfStaticFileB === bufferOfCompiledFileB
      let test3 = bufferOfStaticFileC === bufferOfCompiledFileC
      // test these compairsion
      assert.equal(test1, true)
      assert.equal(test2, true)
      assert.equal(test3, true)
      // kill the app and finish test
      testApp.kill('SIGINT')
    })

    testApp.on('exit', () => {
      done()
    })
  })

  it('should throw an error if a css preprocessor is not provided into the node module param', function (done) {
    // bool var to hold whether or not Roosevelt throws the error that we did not include a css preprocessor
    let missingCSSPreprocessorBool = false

    // generate the app.js file
    generateTestApp({
      appDir: appDir,
      generateFolderStructure: true,
      css: {
        compiler: {
          params: {
            cleanCSS: {
              advanced: true,
              aggressiveMerging: true
            },
            sourceMap: null
          }
        }
      }
    }, options)

    // fork the app.js file and run it as a child process
    const testApp = fork(path.join(appDir, 'app.js'), {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

    // on the error logs, see if the specific error is given
    testApp.stderr.on('data', (data) => {
      if (data.includes('failed to include your CSS preprocessor')) {
        missingCSSPreprocessorBool = true
      }
    })

    // when the app finishes its initalization, kill it
    testApp.on('message', () => {
      testApp.kill('SIGINT')
    })

    // when the app is about to exit, check to see if the specific error was given
    testApp.on('exit', () => {
      if (missingCSSPreprocessorBool === false) {
        assert.fail('Roosevelt did not throw an error on the fact that there is no css preprocessor given to the css nodeModule param')
      }
      done()
    })
  })
})
