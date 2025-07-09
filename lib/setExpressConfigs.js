require('@colors/colors')
const path = require('path')
const fs = require('fs-extra')
const express = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const Sqlite = require('better-sqlite3')
const SqliteStore = require('./sqliteSessionStore')(session)
const helmet = require('helmet')
const { csrfSync } = require('csrf-sync')
const wildcardMatch = require('./tools/wildcardMatch')

module.exports = app => {
  const logger = app.get('logger')
  const params = app.get('params')
  const viewEngineParam = params.viewEngine

  // enable express-session
  if (params.expressSession && params.makeBuildArtifacts !== 'staticsOnly') {
    let store
    if (params.expressSessionStore.instance) store = params.expressSessionStore.instance
    else {
      if (params.mode === 'production-proxy' || (params.localhostOnly && !params.hostPublic)) logger.warn('Session store as-configured will only scale to one process. Read more about scaling sessions in the Roosevelt docs: https://github.com/rooseveltframework/roosevelt')
      if (params.expressSessionStore.preset === 'default') {
        const db = new Sqlite(params.expressSessionStore.filename)
        db.pragma('journal_mode = WAL') // it is generally important to set the WAL pragma for performance reasons https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md
        store = new SqliteStore({
          client: db,
          expired: {
            clear: true,
            intervalMs: params.expressSessionStore.presetOptions.checkPeriod,
            unrefInterval: true
          }
        })
      } else if (params.expressSessionStore.preset === 'express-session-default') store = null
    }

    let sessionOptions
    const secret = fs.readJsonSync(path.join(params.secretsPath, 'sessionSecret.json')).secret
    if (typeof params.expressSession === 'boolean') {
      // use default config
      sessionOptions = {
        // used to sign the session ID cookie
        secret,

        // setting to true forces the session to be saved to the session store even if session wasn't modified during the request
        resave: false,

        // setting to true forces an "uninitialized" session to be saved to the store - a session is "uninitialized" when it is new but not modified
        saveUninitialized: false,
        cookie: {
          secure: params.https.enable,
          sameSite: 'strict',
          maxAge: 347126472000 // set very far in the future (~11 years) to basically never expire
        }
      }
    } else {
      // user has supplied their own config
      sessionOptions = {
        ...params.expressSession,
        secret
      }
    }

    if (store) sessionOptions.store = store
    app.set('expressSessionStore', store) // expose the instance of the express-session store as an express variable
    const expressSession = session(sessionOptions)

    app.use(expressSession)
    app.set('expressSession', expressSession) // expose the instance of express-session as an express variable
  }

  // enable typical express middlewares
  if (params.logging.methods.http) app.use(require('morgan')('combined')) // dumps http requests to the console
  app.use(express.urlencoded(params.bodyParser.urlEncoded)) // defines req.body by parsing http requests
  app.use(express.json(params.bodyParser.json)) // when the HTTP request contains JSON data this parser is used
  app.use(require('method-override')()) // enables PUT and DELETE requests via <input type='hidden' name='_method' value='put'> and suchlike

  // enable CSRF protection middleware
  if (params.csrfProtection && params.makeBuildArtifacts !== 'staticsOnly') {
    if (!params.expressSession) {
      logger.warn('`csrfProtection` is enabled, but `expressSession` is disabled. You must enable `expressSession` for `csrfProtection` to work properly.')
    }

    function extractToken (req) {
      if (req.headers['x-csrf-token']) {
        return req.headers['x-csrf-token'] || null
      } else if (req?.body?._csrf) {
        return req.body._csrf || null
      }
    }

    const {
      invalidCsrfTokenError,
      csrfSynchronisedProtection
    } = csrfSync({
      getTokenFromRequest: extractToken,
      getTokenFromState: extractToken
    })

    // anything registered after this will be considered "protected"
    // apply the protection to all non-GET, HEAD, or OPTIONS routes
    app.use((req, res, next) => {
      if (params.csrfProtection?.exemptions && wildcardMatch(req.url, params.csrfProtection.exemptions)) return next()
      else csrfSynchronisedProtection(req, res, next)
    })

    // custom middleware to handle CSRF errors
    app.use((error, req, res, next) => {
      if (error) {
        if (error === invalidCsrfTokenError) require(params.errorPages.forbidden)(app, req, res)
        else next(error)
      } else next()
    })
  }

  // enable cookie parser
  app.use(cookieParser())

  // set helmet middleware
  if (params.mode !== 'development') {
    let contentSecurityPolicy = params.helmet.contentSecurityPolicy
    if (contentSecurityPolicy === undefined) {
      contentSecurityPolicy = {}
      contentSecurityPolicy.directives = helmet.contentSecurityPolicy.getDefaultDirectives()
      delete contentSecurityPolicy.directives['upgrade-insecure-requests'] // fixes https://github.com/rooseveltframework/roosevelt/issues/964
      contentSecurityPolicy.directives['script-src'].push('\'unsafe-inline\'') // allow inline script tags
      contentSecurityPolicy.directives['form-action'] = null // allow submitting to forms on other domains
    }
    if (params.helmet) app.use(helmet({ ...params.helmet, contentSecurityPolicy }))
  }

  // close connections gracefully if server is being shut down
  app.use(function (req, res, next) {
    if (app.get('roosevelt:state') !== 'disconnecting') next()
    else require(params.errorPages.serviceUnavailable)(app, req, res)
  })

  // set templating engine(s)
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
  app.set('views', app.get('preprocessedViewsPath') || app.get('viewsPath')) // this alternative spelling of this express variable is used internally by express and should be kept in parity with roosevelt's list
  if (Array.isArray(viewEngineParam)) viewEngineParam.forEach(registerViewEngine)
  else if (viewEngineParam !== 'none' && viewEngineParam !== null) registerViewEngine(viewEngineParam)
  else logger.warn('No view engine specified. viewEngine has been disabled.')
}
