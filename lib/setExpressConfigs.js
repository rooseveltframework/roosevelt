// configure specific express options

require('colors')

const morgan = require('morgan') // express logger
const bodyParser = require('body-parser') // express body parser
const prequire = require('parent-require')

module.exports = function (app) {
  const logger = app.get('logger')
  const params = app.get('params')
  const viewEngineParam = params.viewEngine
  let defaultEngine

  function registerViewEngine (paramValue) {
    let viewExt
    let viewEngine
    let viewModule

    try {
      paramValue = paramValue.split(':')
      if (paramValue.length !== 2) {
        throw new Error('viewEngine param formatted incorrectly!')
      }
      viewExt = paramValue[0].trim()
      if (!defaultEngine) {
        defaultEngine = viewExt
        app.set('view engine', viewExt)
      }
      viewEngine = paramValue[1].trim()
      viewModule = prequire(viewEngine)
      app.set(viewEngine, viewModule)
      app.engine(viewExt, (viewModule.__express ? viewModule.__express : viewModule))
    } catch (e) {
      if (e.toString().includes('viewEngine')) {
        logger.error(`${app.get('appName')} fatal error: viewEngine param must be formatted as "fileExtension: nodeModule"`)
      } else {
        logger.error('Failed to register viewEngine, please ensure "viewEngine" param is configured properly.')
      }
      logger.warn('viewEngine has been disabled.')
    }
  }

  // set morgan
  app.set('morgan', morgan)

  // remove unnecessary response headers
  app.disable('x-powered-by')
  app.disable('etag')

  // close connections gracefully if server is being shut down
  app.use(function (req, res, next) {
    if (app.get('roosevelt:state') !== 'disconnecting') {
      next()
    } else {
      require(params.errorPages.serviceUnavailable)(app, req, res)
    }
  })

  // dumps http requests to the console
  if (params.logging.methods.http) {
    app.use(morgan('combined'))
  }

  // defines req.body by parsing http requests
  app.use(bodyParser.urlencoded(params.bodyParser.urlEncoded))

  // when the HTTP request contains JSON data this parser is used
  app.use(bodyParser.json(params.bodyParser.json))

  // enables PUT and DELETE requests via <input type='hidden' name='_method' value='put'> and suchlike
  app.use(require('method-override')())

  // set templating engine(s)
  app.set('views', app.get('viewsPath')) // this alternative spelling of this express variable is used internally by express and should be kept in parity with roosevelt's list
  if (Array.isArray(viewEngineParam)) {
    viewEngineParam.forEach(registerViewEngine)
  } else if (viewEngineParam !== 'none' && viewEngineParam !== null) {
    registerViewEngine(viewEngineParam)
  }

  return app
}
