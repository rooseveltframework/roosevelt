// collects what a roosevelt app logs so a test can assert on it
//
// this works by intercepting roosevelt's logger rather than replacing process.stdout.write, which is what these tests used to do
// replacing process.stdout.write cannot work while each test file runs in its own process, because the runner reports results over stdout and does so after the next test has already begun
// a test that swallowed stdout therefore swallowed the results of the tests around it, and those tests silently disappeared from the run rather than failing
const winston = require('winston')
const { MESSAGE } = require('triple-beam')

const Console = winston.transports.Console
const realLog = Console.prototype.log

let buffer = null

// everything roosevelt logs from here until stop() is collected instead of printed
// the patch is on the transport shared by every logger, so it also covers loggers built after this call, which matters because roosevelt builds its own while starting
function start () {
  buffer = []
  Console.prototype.log = function (info, callback) {
    buffer.push(String(info[MESSAGE] ?? info.message ?? ''))
    if (callback) callback()
  }
}

// hands back what has been logged so far without stopping, for a test that waits for a particular message to show up
function peek () {
  return buffer ? buffer.join('\n') : ''
}

// hands back everything logged since start() and lets logging print normally again
// safe to call when nothing was being collected, so it can be used to clean up after a test that threw partway through
function stop () {
  Console.prototype.log = realLog
  const text = buffer ? buffer.join('\n') : ''
  buffer = null
  return text
}

module.exports = { start, peek, stop }
