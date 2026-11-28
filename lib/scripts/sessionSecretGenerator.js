#!/usr/bin/env node
const crypto = require('crypto')
const fs = require('fs-extra')
const path = require('path')

module.exports = sessionSecretGenerator
module.exports.fromCommandLine = fromCommandLine

// only the command works out an app from the directory it was run in
//
// roosevelt requires this file as it loads, and doing that at the top of the file would mean starting an app from inside another project's directory runs that project's config
if (require.main === module) {
  try {
    fromCommandLine()
  } catch (err) {
    console.error('❌', err)
    process.exitCode = 1
  }
}

// the secretsPath argument only ever applies to the call it is passed to, so one app's path is never left behind for the next caller
function sessionSecretGenerator (secretsPath) {
  // called without a secrets path, which only a script of the app's own would do, the app's params are sourced the way the command does it
  if (!secretsPath) secretsPath = require('./certsGenerator').commandLineParams([]).secretsPath

  const file = path.join(secretsPath, 'sessionSecret.json')

  // anyone who can read this can forge a session cookie, so it is written readable only by the developer it belongs to
  //
  // the mode only applies when a file is created, so it is narrowed again afterwards for a secret being replaced. windows has no posix permission bits and ignores both
  fs.outputJsonSync(file, { secret: crypto.randomUUID() }, { mode: 0o600 })
  fs.chmodSync(file, 0o600)

  return file
}

// the command line version, which takes --appDir and --secretsPath the same way the certificate command does, and says what it did
function fromCommandLine (argv) {
  // the flag parsing and param sourcing live with the certificate command, so the two commands cannot drift apart on what their flags mean
  const { secretsPath } = require('./certsGenerator').commandLineParams(argv)
  const file = sessionSecretGenerator(secretsPath)
  console.log(`Wrote a new session secret to ${file}.`)
  return file
}
