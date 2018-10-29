module.exports = function fakeParams () {
  const defaultLogging = {
    http: true,
    appStatus: true,
    warnings: true,
    verbose: false
  }
  return {
    emptyJsBundle: function () {
      return {
        logging: defaultLogging,
        js: {
          bundler: {
            bundles: [],
            expose: {}
          }
        }
      }
    },
    multiJsBundle: function () {
      return {
        logging: defaultLogging,
        js: {
          bundler: {
            bundles: [
              {
                env: 'dev',
                files: [],
                params: {
                  paths: []
                },
                outputFile: 'b1.js'
              },
              {
                files: [],
                params: {
                  paths: []
                },
                outputFile: 'b2.js'
              }
            ],
            expose: false
          }
        }
      }
    }
  }
}
