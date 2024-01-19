// configure specific express options

require('@colors/colors')

const morgan = require('morgan') // express logger
const express = require('express')
const session = require('express-session')
const helmet = require('helmet')

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
      viewModule = require(viewEngine)
      app.set(viewEngine, viewModule)
      app.set('view: ' + viewExt, (viewModule.__express ? viewModule.__express : viewModule))
      app.engine(viewExt, (viewModule.__express ? viewModule.__express : viewModule))
    } catch (e) {
      if (e.toString().includes('viewEngine param formatted incorrectly!')) {
        logger.error(`${app.get('appName')} fatal error: viewEngine param must be formatted as "fileExtension: nodeModule"`)
      } else {
        logger.error('Failed to register viewEngine, please ensure "viewEngine" param is configured properly.')
      }
      logger.warn('viewEngine has been disabled.')
    }
  }

  // set morgan
  app.set('morgan', morgan)

  // enable express-session
  if (params.expressSession) {
    if (typeof params.expressSession === 'boolean') {
      // user wants default config
      app.use(session({
        // todo: store this secret in an environment variable or the certs folder
        // used to sign the session ID cookie
        secret: crypto.randomUUID(),
        // setting to true forces the session to be saved to the session store even if session wasn't modified during the request
        resave: false,
        // setting to true forces an "uninitialized" session to be saved to the store - a session is "uninitialized" when it is new but not modified
        saveUninitialized: false
      }))
    } else {
      // user has supplied their own configuration
      app.use(session({
        ...params.expressSession,
        secret: crypto.randomUUID() // generate an express session key
      }))
    }
  }

  // set helmet middleware
  if (params.mode !== 'development') {
    let contentSecurityPolicy = params.helmet.contentSecurityPolicy
    if (contentSecurityPolicy === undefined) {
      contentSecurityPolicy = {}
      contentSecurityPolicy.directives = helmet.contentSecurityPolicy.getDefaultDirectives()
      delete contentSecurityPolicy.directives['upgrade-insecure-requests']
    }
    app.use(helmet({ ...params.helmet, contentSecurityPolicy }))
  }

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
  app.use(express.urlencoded(params.bodyParser.urlEncoded))

  // when the HTTP request contains JSON data this parser is used
  app.use(express.json(params.bodyParser.json))

  // enables PUT and DELETE requests via <input type='hidden' name='_method' value='put'> and suchlike
  app.use(require('method-override')())

  // set templating engine(s)
  app.set('views', app.get('viewsPath')) // this alternative spelling of this express variable is used internally by express and should be kept in parity with roosevelt's list
  if (Array.isArray(viewEngineParam)) {
    viewEngineParam.forEach(registerViewEngine)
  } else if (viewEngineParam !== 'none' && viewEngineParam !== null) {
    registerViewEngine(viewEngineParam)
  } else {
    logger.warn('No view engine specified. viewEngine has been disabled.')
  }

  return app
}
