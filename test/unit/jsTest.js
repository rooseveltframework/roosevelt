/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const fse = require('fs-extra')
const path = require('path')
const cleanupTestApp = require('../util/cleanupTestApp')
const fork = require('child_process').fork
const klawSync = require('klaw-sync')

describe('JavaScript Section Tests', function () {
  const appDir = path.join(__dirname, '../app/jsApp')
  const appDir2 = path.join(__dirname, '../app/JSTest')
  const test1 = 'var a = 7'
  const test2 = 'var b = "turkey"'
  const test3 = 'var c = true'
  let operations = []
  let pathsOfStaticJS = [
    path.join(appDir2, 'statics', 'js', 'a.js'),
    path.join(appDir2, 'statics', 'js', 'b.js'),
    path.join(appDir2, 'statics', 'js', 'c.js')
  ]
  let pathsOfCompiledJS = [
    path.join(path.join(appDir2, 'statics', '.build', 'js', 'a.js')),
    path.join(path.join(appDir2, 'statics', '.build', 'js', 'b.js')),
    path.join(path.join(appDir2, 'statics', '.build', 'js', 'c.js'))
  ]
  let staticJSFiles = [
    test1,
    test2,
    test3
  ]

  before(function (done) {
    fse.ensureDirSync(path.join(appDir))
    fse.ensureDirSync(path.join(appDir2, 'statics', 'js'))

    for (let x = 0; x < pathsOfStaticJS.length; x++) {
      operations.push(new Promise((resolve, reject) => {
        fs.writeFile(pathsOfStaticJS[x], staticJSFiles[x], (error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      }))
    }

    operations.push(new Promise((resolve, reject) => {
      fs.readFile(path.join(__dirname, '../util/JSapp.js'), (err, buffer) => {
        if (err) {
          reject(err)
        }
        fs.writeFile(path.join(appDir, 'app.js'), buffer.toString(), (error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })
    }))

    Promise.all(operations).then(() => {
      done()
    })
  })

  after(function (done) {
    cleanupTestApp(appDir, (err) => {
      if (err) {
        throw err
      } else {
        done()
      }
    })
  })

  it('should compile all static js files using roosevelt-uglify', function (done) {
    const testApp = fork(path.join(appDir, 'app.js'))
    testApp.on('close', () => {
      const compiledJS = path.join(path.join(appDir2, 'statics', '.build', 'js'))
      const compiledJSArray = klawSync(compiledJS)
      compiledJSArray.forEach((file) => {
        let test = pathsOfCompiledJS.includes(file.path)
        assert.equal(test, true)
      })
      done()
    })
  })
})
