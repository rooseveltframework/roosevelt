/* eslint-env mocha */

// Global before/after each hook that resets the NODE_ENV variable as Roosevelt explicitly sets it and the testing environment is one continuous process, so if you don't reset the ENV it will override the Roosevelt test params
beforeEach((done) => {
  process.env.NODE_ENV = ''
  done()
})

afterEach((done) => {
  process.env.NODE_ENV = ''
  done()
})
