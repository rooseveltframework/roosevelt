/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
// const cleanupTestApp = require('../util/cleanupTestApp')
const klawSync = require('klaw-sync')

describe('JavaScript Section Test', function () {
  const appDir = path.join(__dirname, '../app/jsTest')
  const test1 = 'var a = 7'
  const test2 = 'var b = "turkey"'
  const test3 = 'var c = true'
  let operations = []
  let pathsOfStaticJS = [
    path.join(appDir, 'statics', 'js', 'a.js'),
    path.join(appDir, 'statics', 'js', 'b.js'),
    path.join(appDir, 'statics', 'js', 'c.js')
  ]
  let pathsOfCompiledJS = [
    path.join(path.join(appDir, 'statics', '.build', 'js', 'a.js')),
    path.join(path.join(appDir, 'statics', '.build', 'js', 'b.js')),
    path.join(path.join(appDir, 'statics', '.build', 'js', 'c.js'))
  ]
  let staticJSFiles = [
    test1,
    test2,
    test3
  ]

  after(function (done) {
  /*
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }

    })
  */
    done()
  })
  it('should compile all static js files using roosevelt-uglify', function (done) {
    fse.ensureDirSync(path.join(appDir, 'statics', 'js'))
    for (let x = 0; x < pathsOfStaticJS.length; x++) {
      operations.push(new Promise((resolve, reject) => {
        fs.writeFile(pathsOfStaticJS[x], staticJSFiles[x], (error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
            console.log('resolved')
          }
        })
      }))
    }
    Promise.all(operations).then(() => {
      console.dir(operations)
      console.log('done writing, going to start server')
      const app = require('../../../roosevelt')({
        appDir: appDir,
        generateFolderStructure: true,
        suppressLogs: {
          httpLogs: true,
          rooseveltLogs: true,
          rooseveltWarnings: true
        },
        js: {
          compiler: {
            nodeModule: 'roosevelt-uglify',
            showWarnings: false,
            params: {}
          },
          output: '.build/js'
        }
      })

      app.initServer(() => {
        console.log('inited server')
        const compiledJS = path.join(path.join(appDir, 'statics', '.build', 'js'))
        const compiledJSArray = klawSync(compiledJS)
        compiledJSArray.forEach((file) => {
          let test = pathsOfCompiledJS.includes(file.path)
          console.log(test)
          assert.equal(test, true)
        })
        done()
      })
    })
  })
})
