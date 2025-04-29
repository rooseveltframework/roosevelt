If you want to deploy a Roosevelt multi-page app or single-page app live to the internet, there are some things you should do to harden it appropriately if you expect to take significant traffic.

## Run the app behind a reverse proxy and use all the CPU cores

To do this, use the `production-proxy-mode` command line flag and run the process on multiple cores using a tool like [pm2](https://pm2.io/docs/runtime/guide/load-balancing/).

Then host your app behind a reverse proxy from a web server like Apache or nginx, which [is considered a best practice for Node.js deployments](https://expressjs.com/en/advanced/best-practice-performance.html#use-a-reverse-proxy).

Running the app in production-proxy mode runs the app in production mode, but with `localhostOnly` set to true and `hostPublic` set to false. This mode will make it so your app only responds to requests coming from the proxy server and does not serve anything in the public folder. You will then need to serve the contents of the public folder directly via Apache or nginx.

## Use HTTPS

Setting up HTTPS can be tricky to configure properly especially for novices, so it can be tempting not do it to simplify deployment, but your website won't be seen as professional if it isn't served up via HTTPS. It's worth the effort to set it up.

## Use a caching service or a database to store sessions

Roosevelt's default session store for `express-session` works great if your app only needs a single process, but if you're spreading your app across multiple processes or servers, you will need to reconfigure `express-session` to use a caching service that supports replication like [redis](https://en.wikipedia.org/wiki/Redis) or a database that supports replication like [PostgreSQL](https://en.wikipedia.org/wiki/PostgreSQL) in order to scale your app.

## Use Roosevelt's static site generator instead if you can

Not all sites need to execute logic dynamically on the backend. If you can get away with making a site using a static site generator, then that will dramatically simplify deployment. [rooseveltframework.org](https://rooseveltframework.org) is itself a static site generated with Roosevelt's static site generator, and you can view its source code [here](https://github.com/rooseveltframework/roosevelt-website).
