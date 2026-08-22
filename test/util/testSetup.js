// hooks that apply to every test
// preloaded for every test file by the test scripts in package.json, so no test file needs to ask for it
// the flag has to be --import: a module that registers test hooks during a --require preload makes node start a second empty test run, which ends the real run early and still reports success, and every version roosevelt supports behaves that way
//
// each test file runs in its own process, and those processes run at the same time, so nothing one file does can reach another
//
// follow these two rules to prevent parallel tests from interfering with each other:
//   1. every app a test starts listens on a port no other test uses
//   2. every test file keeps its app under test/app in a folder of its own, and only ever deletes that folder, never the one above it
const { beforeEach, afterEach, after } = require('node:test')
const captureLogs = require('./captureLogs')

// roosevelt sets NODE_ENV itself, and the tests in a file all share one process, so it is cleared around every test to stop one test from changing the params another test reads
// it has to be deleted rather than blanked, because source-configs reads any environment variable that is merely present
beforeEach(() => {
  delete process.env.NODE_ENV
})

afterEach(() => {
  delete process.env.NODE_ENV
  captureLogs.stop() // a test that threw partway through may have left logging collected instead of printed, which would hide the next test's output
})

// messages the suite means to produce, checked against each line written to stderr
// add a pattern to this array only when the output is both expected and worth keeping; capturing it in the test itself is usually better, since that asserts on the message instead of merely tolerating it
const expected = []

const realWrite = process.stderr.write.bind(process.stderr)

let captured = []
const violations = []

// the writes are passed through as well as recorded, so a failure can still be read in context
process.stderr.write = (chunk, ...rest) => {
  captured.push(String(chunk))
  return realWrite(chunk, ...rest)
}

beforeEach(() => {
  captured = []
})

// the violations are collected rather than thrown here, because a throwing afterEach would stop the rest of the file from running
afterEach(t => {
  const lines = captured
    .join('')
    .split('\n')
    // eslint-disable-next-line no-control-regex
    .map(line => line.replace(/\x1b\[[0-9;]*m/g, '').trim())
    .filter(line => line && !expected.some(pattern => pattern.test(line)))

  captured = []

  if (lines.length) violations.push({ test: t?.name || 'unknown test', lines })
})

// the failure is reported by printing and setting the exit code rather than by throwing, because the runner reports a throw from here without letting it change the exit code, which would leave this silent in CI
after(() => {
  process.stderr.write = realWrite

  if (!violations.length) return

  const report = violations.map(({ test, lines }) => `  ${test}\n${lines.map(line => `    ${line}`).join('\n')}`).join('\n\n')

  // fail the run if anything writes to stderr without meaning to
  // roosevelt logs warnings and errors to stderr, so anything landing there during a passing test is either a real problem or a message nobody intended to print
  realWrite(`\nunexpected stderr output from ${violations.length} test(s):\n\n${report}\n\nif a test means to produce this, capture stderr inside the test and assert on it, or add a pattern to the expected list in test/util/testSetup.js\n`)
  process.exitCode = 1
})
