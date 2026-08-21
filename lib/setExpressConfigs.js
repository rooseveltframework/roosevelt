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
const docsUrl = require('./tools/docsUrl')

// the methods that do not change state, which neither csrf layer checks
const safeMethods = ['GET', 'HEAD', 'OPTIONS']

module.exports = app => {
  const logger = app.get('logger')
  const startupNotice = require('./tools/startupNotice')(app)
  const params = app.get('params')
  const viewEngineParam = params.viewEngine

  // tell express how much of what a proxy says about a request to believe
  // without this, a request forwarded by a web server looks like it came from that web server over plain http, so req.ip is the proxy rather than the visitor and secure cookies are never sent
  if (params.trustProxy !== false) app.set('trust proxy', params.trustProxy)

  // enable cookie parser
  // this runs first so that anything below it, notably the session cookie check, can read req.cookies
  app.use(cookieParser())

  // enable express-session
  if (params.expressSession && params.makeBuildArtifacts !== 'staticsOnly') {
    let store
    if (params.expressSessionStore.instance) store = params.expressSessionStore.instance
    else {
      if (params.mode === 'production-proxy' || (params.localhostOnly && !params.hostPublic)) startupNotice('sessionStoreScaling', `Session store as-configured keeps sessions in a file on this server only, so no other server can read them. If you run your app on more than one server, a visitor will be signed out whenever a request lands on a different one than signed them in. If you want to replicate your app across multiple servers, switch to a session store every server can reach, such as Redis or PostgreSQL. Read more about scaling sessions in the Roosevelt docs: ${docsUrl}/deployment`)
      if (params.expressSessionStore.preset === 'default') {
        const db = new Sqlite(params.expressSessionStore.filename)
        db.pragma('journal_mode = WAL') // it is generally important to set the WAL pragma for performance reasons https://github.com/WiseLibs/better-sqlite3/blob/master/docs/performance.md
        store = new SqliteStore({
          client: db,
          maxInactivity: params.expressSessionStore.maxInactivity,
          expired: {
            clear: true,
            intervalMs: params.expressSessionStore.presetOptions.checkPeriod,
            unrefInterval: true
          }
        })
      } else if (params.expressSessionStore.preset === 'express-session-default') store = null
    }

    let sessionOptions
    let secureDecidedByRoosevelt = false
    const secret = fs.readJsonSync(path.join(params.secretsPath, 'sessionSecret.json')).secret
    if (typeof params.expressSession === 'boolean') {
      secureDecidedByRoosevelt = true
      // use default config
      sessionOptions = {
        // used to sign the session ID cookie
        secret,

        // setting to true forces the session to be saved to the session store even if session wasn't modified during the request
        resave: false,

        // setting to true forces an "uninitialized" session to be saved to the store - a session is "uninitialized" when it is new but not modified
        saveUninitialized: false,
        cookie: {
          // 'auto' lets express-session mark the cookie https only per request, working it out from the same trust proxy setting roosevelt configures, so it covers an app serving https itself and an app whose web server serves https on its behalf
          // deciding this once at startup cannot cover both, and getting it wrong in the strict direction is worse than it sounds: express refuses to send a cookie it has been told is https only over a connection it believes is plain http, so an app behind a plain http web server would hand out no session cookie at all and simply never keep anyone signed in
          secure: 'auto',
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

      // sameSite is one of the protections that stops another site from making requests as your logged in users, and a hand written session config can leave it out without meaning to
      const sameSite = String(params.expressSession?.cookie?.sameSite ?? '').toLowerCase()
      if (sameSite !== 'strict' && sameSite !== 'lax' && sameSite !== 'true') {
        startupNotice('sameSiteUnset', 'Your `expressSession` config does not set `cookie.sameSite` to `strict` or `lax`. That setting is one of the protections that stops another site from making requests as your logged in users. Roosevelt\'s `csrfProtection` still covers you, but do not disable it while `sameSite` is unset.')
      }
    }

    if (store) sessionOptions.store = store
    app.set('expressSessionStore', store) // expose the instance of the express-session store as an express variable
    const expressSession = session(sessionOptions)

    app.use(expressSession)
    app.set('expressSession', expressSession) // expose the instance of express-session as an express variable

    // 'auto' means a request arriving over plain http produces a cookie that is not marked https only, which is correct for a deployment with no encryption anywhere but is usually a mistake in a production mode
    // the common cause is a web server that serves https to visitors but was never told to pass the visitor's protocol along, which leaves the app believing every visitor is on plain http
    // this waits for a request because nothing at startup reveals what the web server in front will report, and it speaks up only once so that a busy app does not repeat it on every hit
    if (secureDecidedByRoosevelt && (params.mode === 'production' || params.mode === 'production-proxy')) {
      let saidSo = false
      app.use((req, res, next) => {
        if (!saidSo && !req.secure) {
          saidSo = true
          startupNotice('insecureSessionCookie', `Roosevelt is handing out session cookies that are not marked HTTPS only, because requests are reaching this app over plain HTTP. Anyone able to watch the network can read them and use them to sign in as your users. If a web server sits in front of this app, check that it serves HTTPS and that it sets the \`X-Forwarded-Proto\` header, and check that \`trustProxy\` matches how many web servers are in front. Read more: ${docsUrl}/deployment`)
        }
        next()
      })
    }

    // a session that was deleted for inactivity leaves the browser holding a cookie for a session that no longer exists
    // express-session quietly starts a fresh session in that case and says nothing, so the dead cookie is cleared here rather than left to linger until its own far off expiry
    const sessionCookieName = sessionOptions.name || 'connect.sid'
    app.use((req, res, next) => {
      // express-session stores the id as `s:<id>.<signature>` once it has been signed
      const presented = req.cookies[sessionCookieName]
      const presentedId = presented && (presented.startsWith('s:') ? presented.slice(2) : presented).split('.')[0]
      if (presentedId && req.sessionID && presentedId !== req.sessionID) {
        res.clearCookie(sessionCookieName, {
          path: sessionOptions.cookie?.path || '/',
          httpOnly: sessionOptions.cookie?.httpOnly ?? true,
          secure: sessionOptions.cookie?.secure,
          sameSite: sessionOptions.cookie?.sameSite
        })
      }
      next()
    })
  }

  // enable typical express middlewares
  if (params.logging.methods.http) app.use(require('morgan')('combined')) // dumps http requests to the console
  app.use(express.urlencoded(params.bodyParser.urlEncoded)) // defines req.body by parsing http requests
  app.use(express.json(params.bodyParser.json)) // when the HTTP request contains JSON data this parser is used
  app.use(require('method-override')()) // enables PUT and DELETE requests via <input type='hidden' name='_method' value='put'> and suchlike

  // enable CSRF protection middleware
  if (params.csrfProtection && params.makeBuildArtifacts !== 'staticsOnly') {
    const exemptions = params.csrfProtection?.exemptions
    const trustedOrigins = params.csrfProtection?.trustedOrigins || []
    const requireTokens = params.csrfProtection?.requireTokens ?? false
    const blockCrossSiteRequests = params.csrfProtection?.blockCrossSiteRequests !== false

    if (requireTokens && !params.expressSession) {
      logger.warn('`csrfProtection` is set to require tokens, but `expressSession` is disabled. You must enable `expressSession` for tokens to work properly.')
    }

    // the browser tells us where a request came from, and page scripts cannot change what it says
    // note that requests from another subdomain of your own site are reported as coming from you, so this cannot tell them apart; only a token can
    function browserSaysItCameFromThisSite (req) {
      const site = req.headers['sec-fetch-site']
      return site === 'same-origin' || site === 'same-site'
    }

    // an origin the app has said it expects requests from, such as a payment provider posting back after checkout
    function fromATrustedOrigin (req) {
      return trustedOrigins.includes(req.headers.origin)
    }

    if (blockCrossSiteRequests) {
      app.use((req, res, next) => {
        if (safeMethods.includes(req.method)) return next()
        if (exemptions && wildcardMatch(req.url, exemptions)) return next()
        if (browserSaysItCameFromThisSite(req) || fromATrustedOrigin(req)) return next()

        // when tokens are always required, the token check below is what decides, so nothing is rejected here
        if (requireTokens === true) return next()

        // when tokens are the fallback, a request that arrived without the header goes on to the token check
        if (requireTokens === 'whenHeaderMissing' && !req.headers['sec-fetch-site']) return next()

        // the two reasons a request lands here need different fixes, so the log says which one happened
        if (req.headers['sec-fetch-site']) logger.warn(`Blocked a ${req.method} request to ${req.url} because the browser said it came from another site. Add its origin to \`csrfProtection.trustedOrigins\` if you expect it.`)
        else logger.warn(`Blocked a ${req.method} request to ${req.url} because it did not say where it came from, which is what anything other than a browser will do. Add this route to \`csrfProtection.exemptions\` if you expect it.`)
        return require(params.errorPages.forbidden)(app, req, res)
      })
    }

    if (requireTokens) {
      function extractToken (req) { // eslint-disable-line
        return req.headers['x-csrf-token'] || req.body?._csrf || null
      }

      const {
        invalidCsrfTokenError,
        csrfSynchronisedProtection
      } = csrfSync({ getTokenFromRequest: extractToken })

      // anything registered after this will be considered "protected"
      // apply the protection to all non-GET, HEAD, or OPTIONS routes
      app.use((req, res, next) => {
        if (exemptions && wildcardMatch(req.url, exemptions)) return next()

        // in fallback mode the header already vouched for anything that carried one, so only headerless requests need a token
        if (requireTokens === 'whenHeaderMissing' && req.headers['sec-fetch-site']) return next()

        return csrfSynchronisedProtection(req, res, next)
      })

      // custom middleware to handle CSRF errors
      app.use((error, req, res, next) => {
        if (error) {
          if (error === invalidCsrfTokenError) require(params.errorPages.forbidden)(app, req, res)
          else next(error)
        } else next()
      })
    }
  }

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
      startupNotice('viewEngineDisabled', 'viewEngine has been disabled.')
    }
  }
  app.set('views', app.get('preprocessedViewsPath') || app.get('viewsPath')) // this alternative spelling of this express variable is used internally by express and should be kept in parity with roosevelt's list
  if (Array.isArray(viewEngineParam)) viewEngineParam.forEach(registerViewEngine)
  else if (viewEngineParam !== 'none' && viewEngineParam !== null) registerViewEngine(viewEngineParam)
  else startupNotice('noViewEngine', 'No view engine specified. viewEngine has been disabled.')
}
