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
    singleJsBundle: function () {
      return {
        logging: defaultLogging,
        js: {
          bundler: {
            bundles: [
              {
                env: '',
                files: [],
                params: {
                  paths: []
                },
                outputFile: ''
              }
            ],
            expose: {}
          }
        }
      }
    }
  }
}
