require('../roosevelt')({
  /*
    param name:               default value

    name:                     'Roosevelt Express',
    port:                     43711,
    modelsPath:               'mvc/models',
    viewsPath:                'mvc/views',
    controllersPath:          'mvc/controllers',
    notFoundPage:             '404.js',
    staticsRoot:              'statics',
    cssPath:                  'statics/css',
    lessPath:                 'statics/less',
    prefixStaticsWithVersion: false, // changes static urls like /css/file.css to /{versionNumber}/css/file.css
    versionNumberLessVar:     '', // populate statics/less/version.less with a LESS variable of this name
    formidableSettings:       {}, // settings to pass to formidable: https://github.com/felixge/node-formidable#api

    events:                   sample function

    onServerStart:            function(app) {
                                // code which executes when the server starts
                              },
    onReqStart:               function(req, res, next) {
                                // code which executes at the beginning of each request
                                // must call next() when your code finishes
                              },
    onReqBeforeRoute:         function(req, res, next) {
                                // code which executes just before the controller is executed
                                // must call next() when your code finishes
                              },
    onReqAfterRoute:          function(req, res) {
                                // code which executes after the request finishes
                              }
  */
});