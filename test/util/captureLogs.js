// collects what a roosevelt app logs so a test can assert on it
//
// this intercepts roosevelt's logger rather than replacing process.stdout.write for the duration of a test, which is what these tests used to do
//
// replacing it outright cannot work while each test file runs in its own process, because the runner reports results over stdout and does so after the next test has already begun, so a test that swallowed stdout swallowed the results of the tests around it, and those tests silently disappeared from the run rather than failing
//
// the logger writes straight to process.stdout and process.stderr, and _createLog is the one funnel every log method goes through, so the streams are redirected only for the duration of a single log call and put back immediately
//
// that keeps the runner's own output untouched, and it collects the message exactly as it would have been printed, prefix, color and all
const Logger = require('roosevelt-logger')

const realCreateLog = Logger.prototype._createLog

let buffer = null

// everything roosevelt logs from here until stop() is collected instead of printed
//
// the patch is on the class rather than on an instance, so it also covers loggers built after this call, which matters because roosevelt builds its own while starting
function start () {
  buffer = []
  Logger.prototype._createLog = function (...args) {
    const stdout = process.stdout.write
    const stderr = process.stderr.write
    const collect = chunk => {
      buffer.push(String(chunk))
      return true
    }

    process.stdout.write = collect
    process.stderr.write = collect
    try {
      return realCreateLog.apply(this, args)
    } finally {
      process.stdout.write = stdout
      process.stderr.write = stderr
    }
  }
}

// hands back what has been logged so far without stopping, for a test that waits for a particular message to show up
function peek () {
  return buffer ? buffer.join('') : ''
}

// hands back everything logged since start() and lets logging print normally again
//
// safe to call when nothing was being collected, so it can be used to clean up after a test that threw partway through
function stop () {
  Logger.prototype._createLog = realCreateLog
  const text = buffer ? buffer.join('') : ''
  buffer = null
  return text
}

module.exports = { start, peek, stop }
