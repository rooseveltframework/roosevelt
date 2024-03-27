// configure specific express options
const fs = require('fs')
const path = require('path')
require('@colors/colors')

const morgan = require('morgan') // express logger
const express = require('express')
const session = require('express-session')
const MemoryStore = require('memorystore')(session)
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
    const secret = JSON.parse(fs.readFileSync(params.secretsDir + '/sessionSecret.json', 'utf-8')).secret
    let store

    if (params.expressSessionStore.instance) {
      store = params.expressSessionStore.instance
    } else if (params.expressSessionStore.preset === 'default') {
      logger.warn('The express-session storage is set to the default "MemoryStore," which works well for small scale applications. However, for larger applications it is highly recommended to update this to something more scalable such as SQLite or Redis. Go to <README LINK HERE> to find more information on how to update your session storage.')

      store = new MemoryStore({ ...params.expressSessionStore.presetOptions })
    } else if (params.expressSessionStore.preset === 'express-session-default') {
      store = null
    }

    if (typeof params.expressSession === 'boolean') {
      // use default config
      const sessionOptions = {
        secret, // used to sign the session ID cookie
        resave: false, // setting to true forces the session to be saved to the session store even if session wasn't modified during the request
        saveUninitialized: false // setting to true forces an "uninitialized" session to be saved to the store - a session is "uninitialized" when it is new but not modified
      }

      if (store) sessionOptions.store = store

      app.use(session(sessionOptions))
    } else {
      const sessionOptions = {
        ...params.expressSession,
        secret
      }

      if (store) sessionOptions.store = store

      // user has supplied their own configuration
      app.use(session(sessionOptions))
    }

    // CSRF protection - only enabled if expressSession is also enabled
    // TODO: remove this self invoked function when async rework is added to roosevelt
    ;(async () => {
      const { csrf } = await import('malibu')

      // display a proper error page instead of malibu's plaintext response
      // TODO: make it possible for the app to customize this page
      const forbiddenPage = fs.readFileSync(path.join(__dirname, '/../defaultErrorPages/views/403.html'), 'utf-8')
      const templateParser = require('es6-template-strings')
      function modifyMalibuInvalidCsrfTokenError (req, res, next) {
        const oldwriteHead = res.writeHead
        res.writeHead = function (data) {
          if (arguments[1] === 'invalid csrf token') {
            const model = {
              url: req.url,
              mainDomain: req.headers['x-forwarded-host'] || req.headers.host,
              appVersion: app.get('appVersion')
            }
            res.set('Content-Type', 'text/html')
            res.set('CSRF-Error', 'invalid csrf token')
            res.status(403)
            logger.warn('Invalid CSRF token detected. Sending 403 Forbidden page. If that is not what you intended, see the Roosevelt docs for more information about handling CSRF tokens: https://github.com/rooseveltframework/roosevelt#csrf-protection')
            return res.send(templateParser(forbiddenPage, model))
          } else oldwriteHead.apply(res, arguments)
        }
        next()
      }
      app.use(modifyMalibuInvalidCsrfTokenError)
      if (params.csrfProtection === 'manual') app.set('csrfProtection', csrf({ middleware: 'session' })) // choose which routes are protected
      else if (params.csrfProtection === 'full') app.use(csrf({ middleware: 'session' })) // all routes protected
    })()
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
