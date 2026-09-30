If you want to deploy a Roosevelt multi-page app or single-page app live to the internet, there are some things you should do to harden it appropriately if you expect to take significant traffic.

## Run the app behind a reverse proxy and use all the CPU cores

To do this, use the `--production-proxy-mode` command line flag and run the process on multiple cores using a tool like [pm2](https://pm2.io/docs/runtime/guide/load-balancing/).

Then host your app behind a reverse proxy from a web server like Apache or nginx, which [is considered a best practice for Node.js deployments](https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy).

Running the app in production-proxy mode runs the app in production mode, but with `localhostOnly` set to true and `hostPublic` set to false. This mode will make it so your app only responds to requests coming from the proxy server and does not serve anything in the public folder. You will then need to serve the contents of the public folder directly via Apache or nginx.

### Check how many web servers sit in front of your app

Behind a proxy, your app never talks to visitors directly, so everything it can see about who is calling describes the proxy instead. Roosevelt handles this for you in `production-proxy` mode by assuming there is exactly one web server in front of your app, which is the usual setup.

If that is not your setup, set the `trustProxy` param to the number of things a request passes through before it reaches Node.js. A request going visitor → load balancer → nginx → your app passes through two, so that app wants `trustProxy: 2`.

If you get it wrong with too small a number, your app will see the address of whatever is in front of it rather than the visitor. Getting it wrong in the other direction (too large a number) is a security vulnerability that would let a visitor claim to be at any address they like, so do not raise the number past what you actually have. See the [deployment options](./CONFIG-DEPLOYMENT.md) for a fuller explanation.

## Use HTTPS

Setting up HTTPS can be tricky to configure properly especially for novices, so it can be tempting not to do it to simplify deployment. Do it anyway. Without it, everything between your visitors and your app travels in the open, including the session cookies that keep people signed in, which means anyone able to watch the network can copy one and use it to sign in as that visitor. Browsers also mark plain HTTP sites as not secure in the address bar, which visitors notice.

Roosevelt's `https.autoCert` feature generates self-signed certs, but only in development mode. Self-signed certs are for local development and will show your visitors a browser warning, so a live site needs a real certificate from a certificate authority. Most deployments terminate HTTPS at the reverse proxy rather than in the app, which pairs with the proxy setup above.

## Generate your secrets ahead of time, and share them across servers

Roosevelt generates a session secret into `secrets/sessionSecret.json` the first time an app starts without one. That is fine on one machine and a problem everywhere else, because the secret signs your session cookies: if each server generates its own, a visitor whose requests land on a different server than the one that logged them in is treated as logged out.

Generate your secrets as part of your deployment rather than letting each server invent its own:

```bash
npx roosevelt-generate-secrets
```

Then treat the contents of your secrets folder the way you treat any other credential:

- Keep it out of version control.
- Distribute the same secret to every server and process running your app.
- Make sure your deployment does not wipe it between releases, since replacing the secret logs everyone out.

## Store sessions somewhere every server can reach

Roosevelt keeps sessions in a SQLite file next to your app by default. That is a good fit for one server, and it is the first thing that breaks when you add a second, because a file on one machine cannot be read by another. A visitor is signed out the moment a request lands on a server other than the one that signed them in. Roosevelt warns about this at startup in `production-proxy` mode.

Do not try to replicate the SQLite file. SQLite is built around one machine writing to one file, and the tools that replicate it are built for keeping a backup copy or serving reads, not for several servers writing at once. Some tools do make it work by sending every write to one designated machine, but that turns SQLite into a database reached over the network, which is what the better options already are, without the extra moving parts. Putting the file on a network drive shared between servers is worse than it sounds and can corrupt the database outright.

Use a session store your servers all connect to instead. The simplest is a database your app already uses: set `expressSessionStore.preset` to `postgres`, `mysql`, or `mariadb`, and Roosevelt keeps sessions in a `sessions` table there, which it makes the first time it is used. These presets work the same way as the default store, including clearing out sessions nobody has used for `maxInactivity`. Give the preset a connection pool as `presetOptions.client`:

```javascript
const { Pool } = require('pg')

module.exports = {
  expressSessionStore: {
    preset: 'postgres',
    presetOptions: {
      client: new Pool({ connectionString: process.env.DATABASE_URL }) // a pool does not connect until it is first used
    }
  }
}
```

A [mysql2](https://sidorares.github.io/node-mysql2/) or [mariadb](https://github.com/mariadb-corporation/mariadb-connector-nodejs) pool works the same way with the `mysql` or `mariadb` preset. If your app already connects to its database in its `onBeforeMiddleware` event and sets it as `app.get('db')`, leave out `presetOptions.client` and the preset uses that instead.

[Redis](https://en.wikipedia.org/wiki/Redis) is the other usual choice, if you run it already or want sessions kept apart from your data. Give Roosevelt any [express-session compatible store](https://expressjs.com/en/resources/middleware/session.html#compatible-session-stores) as `expressSessionStore.instance`, and it uses that instead of the SQLite file:

```javascript
const { createClient } = require('redis')
const RedisStore = require('connect-redis').default

const client = createClient({ url: process.env.REDIS_URL })
client.connect()

module.exports = {
  expressSessionStore: {
    instance: new RedisStore({ client })
  }
}
```

A store you supply this way clears out sessions by its own rules rather than by `maxInactivity`. Many only delete a session once its cookie expires, which with Roosevelt's default of about 11 years means sessions nobody comes back to are kept for that long. Check what yours does.

If you get far enough that one database is genuinely the limit, the next step is read replicas: one database takes all the writes, and copies of it answer reads. Your app has to decide which queries go where, and a replica can be a moment behind, so a visitor who saves something and immediately looks at it may not see their own change. Sending reads back to the main database right after a write is the usual way around that. Managed database services handle most of this for you and are worth considering before building it yourself.

## Give users a new session when they log in

This applies to any app with logins, whichever session store it uses. A visitor usually has a session before they log in, from browsing your site. If your app logs them in by adding who they are to that same session, anyone who already knew its ID now has a logged-in session as that user. Someone could have learned or set the ID beforehand, for example on a shared computer, or by planting a cookie from another subdomain of your site. This is called session fixation. To prevent it, call `req.session.regenerate()` when a user logs in, which replaces their session with a new one under a new ID, and put who they are in the new one:

```javascript
req.session.regenerate(err => {
  if (err) return next(err)
  req.session.userId = user.id
  req.session.save(err => err ? next(err) : res.redirect('/'))
})
```

See also `expressSession` in the configuration docs.

## Use CSRF tokens on untrusted subdomains

If anything untrusted is hosted on a subdomain you share, such as user uploaded content or a separate app someone else runs, set `csrfProtection.requireTokens` to `true`. Browsers report a request from another subdomain of your own site the same way they report one of your own pages, so tokens are the only thing that distinguishes them.

## Configure trusted domains

If another site is expected to post to your app, such as a payment provider sending a callback, add it to `csrfProtection.trustedOrigins`.

## Exempt special requests from CSRF protection

Anything that is not a browser does not report where a request came from at all, so those routes belong in `csrfProtection.exemptions`.

## Restart gracefully

When Roosevelt is asked to shut down, it stops accepting new connections and waits for the requests already in flight to finish, giving up after `shutdownTimeout`, which defaults to 30 seconds.

Your process manager needs to allow at least that long, or it will kill the app partway through serving someone. pm2, for example, waits 1.6 seconds by default, so raise its `kill_timeout` to match whatever you have set `shutdownTimeout` to.

## Decide where you want your HTTP logs

Roosevelt logs every HTTP request by default, and so does your reverse proxy, so a deployment behind one keeps two records of the same traffic. Both name the real visitor: Roosevelt reads the visitor's address through `trustProxy`, which `production-proxy` mode sets up for you.

Keeping both is not wrong, and there are good reasons to. Roosevelt's logs show what your app did with a request after routing, and they are on hand in your app's own output when you are working out what went wrong. If you would rather keep only your proxy's copy, set `logging.methods.http` to `false`.

Do check that your proxy is actually logging before you switch Roosevelt's off, since that is the one arrangement that leaves you with no record at all.

## Version your public folder to control caching

Setting `versionedPublic` to `true` puts your app's version number from `package.json` into the path of your public folder. Because the path changes with every release, you can tell your proxy to cache those files for a long time without worrying about visitors holding on to a stale copy after you deploy.

## Do not ship source maps or stale build output

`prodSourceMaps` is off by default, so production builds do not generate source maps. Source maps left over from a development build are a different matter: they sit in your public folder until something clears them, and Roosevelt warns at startup when it finds any. Clear your public folder before a production build if you do not want to publish the source of your CSS and JS.

## Use Roosevelt's static site generator instead if you can

Not all sites need to execute logic dynamically on the backend. If you can get away with making a site using a static site generator, then that will dramatically simplify deployment. [rooseveltframework.org](https://rooseveltframework.org) is itself a static site generated with Roosevelt's static site generator, and you can view its source code [here](https://github.com/rooseveltframework/roosevelt-website).
