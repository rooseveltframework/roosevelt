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

Use a session store your servers all connect to instead. [Redis](https://en.wikipedia.org/wiki/Redis) is the usual choice, and [PostgreSQL](https://en.wikipedia.org/wiki/PostgreSQL) works well if you would rather not run something extra. Set `expressSessionStore.instance` and Roosevelt will use it instead of the SQLite file:

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

Swap in `connect-pg-simple` the same way if you are using PostgreSQL.

## Scale across several servers

Running your app on more than one server means putting a load balancer in front of them and making sure nothing your app depends on lives on only one of them. There are four things to get right, and skipping any of them produces a site that works when you test it and misbehaves for a fraction of your visitors.

**Share the session secret.** Covered above. Generate it once during deployment and copy the same one to every server, or each will hand out cookies the others reject.

**Move sessions off the local disk.** Covered above.

**Count your web servers again.** `production-proxy` mode assumes one web server in front of your app, so `trustProxy` is `1`. Adding a load balancer makes it visitor → load balancer → nginx → your app, which is two, so set `trustProxy: 2`. Leave it at `1` and every visitor's address reads as your load balancer, which quietly breaks anything that depends on knowing who is calling: rate limiting, abuse blocking, and your logs.

**Get your public folder onto every server.** `production-proxy` mode does not serve your public folder, so each web server needs its own copy, or you serve it from a CDN. Build it once during deployment and copy the result out, rather than building separately on each server. If you also use `versionedPublic`, separate builds can disagree about what is in the folder for a given version, which shows up as files that load on some visits and not others.

Beyond that, anything your app writes to its own disk is worth a second look, since a file saved on one server is not there when the next request lands elsewhere. Uploads are the usual example, and they generally belong in a dedicated file storage server rather than on the web server.

### What about the database your app uses for its own data

Roosevelt does not manage that database or connect to it for you, so this is about your app rather than the framework. The short version is that you usually do not need to do anything: a single well provisioned database serves a large amount of traffic, and the normal shape of a growing app is many app servers talking to one database.

The thing that does bite when you add app servers is the number of connections. PostgreSQL runs a separate process per connection, so ten servers each running four copies of your app with a pool of ten connections is four hundred processes, and it will struggle long before your hardware does. A connection pooler such as PgBouncer sits between your app and the database and is usually the whole fix.

If you get far enough that one database is genuinely the limit, the next step is read replicas: one database takes all the writes, and copies of it answer reads. Your app has to decide which queries go where, and a replica can be a moment behind, so a visitor who saves something and immediately looks at it may not see their own change. Sending reads back to the main database right after a write is the usual way around that. Managed database services handle most of this for you and are worth considering before building it yourself.

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
