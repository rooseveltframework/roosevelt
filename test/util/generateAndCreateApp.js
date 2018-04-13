const generateTestApp = require('../util/generateTestApp')
const EventEmitter = require('events')
const fork = require('child_process').fork
const path = require('path')

let myEmitter = new EventEmitter()

function getEmitter () {
  return myEmitter
}

function deleteAndCreateEventEmitter () {
  myEmitter = undefined
  myEmitter = new EventEmitter()
}

function startRooseveltServer (rooseveltParams, options, appDir, logs, errors) {
  // generate the test app.js file
  generateTestApp(rooseveltParams, options)

  let testApp = fork(path.join(appDir, 'app.js'), ['--dev'], {'stdio': ['pipe', 'pipe', 'pipe', 'ipc']})

  if (logs) {
    testApp.stdout.on('data', (data) => {
      myEmitter.emit('log', data)
    })
  }

  if (errors) {
    testApp.stderr.on('data', (data) => {
      myEmitter.emit('error', data)
    })
  }

  testApp.on('message', (params) => {
    myEmitter.emit('message', params)
  })

  myEmitter.on('kill', () => {
    testApp.kill('SIGINT')
  })

  testApp.on('exit', () => {
    myEmitter.emit('end')
  })
}

module.exports.startRooseveltServer = startRooseveltServer
module.exports.getEmitter = getEmitter
module.exports.deleteAndCreateEventEmitter = deleteAndCreateEventEmitter
