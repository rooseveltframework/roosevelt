# Deployment options

- `hostPublic` *[Boolean]*: Whether or not to allow Roosevelt to host the public folder. Default: `true`, but `production-proxy` mode forces it to `false`, since that mode expects a web server in front of your app. Host the public folder through that web server instead, such as Apache or nginx, which are better optimized for serving static files.

- `localhostOnly` *[Boolean]*: Listen only to requests coming from localhost, in every mode. This is useful where HTTP requests to your app are expected to be proxied through a more traditional web server like Apache or nginx, since it stops anything reaching your app except through that web server. Default: `false`, but `production-proxy` mode forces it to `true`.

- `trustProxy` *[Number, Boolean, or String]*: How many web servers sit in front of your app. Default: `"auto"`, which means Roosevelt picks for you: `1` in `production-proxy` mode, and `false` in every other mode.

## What `trustProxy` is for

When your app sits behind a web server like Apache or nginx, your app never talks to your visitors directly. The web server does, and then it makes its own request to your app on their behalf.

That means everything your app can see about who is calling describes the web server rather than the visitor. The address is the web server's address, usually `127.0.0.1`, and the connection looks like plain HTTP even when the visitor is on HTTPS, because the web server is the one handling the encryption.

Web servers make up for this by adding a few headers that describe the original visitor. `trustProxy` tells your app whether to believe them.

With it set correctly, your app sees the visitor's real address in `req.ip`, knows the visitor came in over HTTPS, and can mark session cookies as HTTPS only. Without it, your logs record your own web server as the visitor for every request, anything that works by address such as rate limiting treats all of your traffic as one person, and session cookies marked HTTPS only are never sent at all, because your app believes the connection is not encrypted.

## Why it is a number

Those headers are added by whatever is in front of your app, but nothing stops a visitor from sending them too. If your app simply believed every one it received, anyone could claim to be at any address, and claim their connection was encrypted when it was not.

So instead of believing the headers outright, your app counts backwards from the connection it actually received. `trustProxy: 1` means "there is one web server in front of me, so skip the last entry and take the one before it". A visitor cannot forge that, because the entry your app lands on is the one your own web server added.

This is why the number has to match your setup:

- `1` if your app sits behind a single Apache or nginx. This is the usual case, and what `production-proxy` mode uses.
- `2` if something else sits in front of that, such as a CDN or a load balancer.
- `false` if nothing is in front of your app and visitors reach it directly, which is why every mode other than `production-proxy` starts here.
- `"auto"` to hand the decision back to Roosevelt, which is what it does when you do not set this at all.

If you are not sure how many there are, count the things a request passes through before it reaches Node.js. A request going visitor → Cloudflare → nginx → your app passes through two.

Getting the number too low means you see the address of whatever is in front of you rather than the visitor. Getting it too high, or turning it on when nothing is in front of your app, means a visitor can tell your app whatever they like about themselves. Too low is merely unhelpful. Too high is a security problem, so leave it off unless you know something is in front of you.

`trustProxy` also accepts the other forms Express does, such as `'loopback'` or an IP range, if you need to describe your setup more precisely. See the [Express documentation on trusting proxies](https://expressjs.com/en/guide/behind-proxies.html) for those.

## How this affects staying signed in

Session cookies are what keep your users signed in. A cookie marked HTTPS only is never sent over an unencrypted connection, which is what stops someone watching the network from copying it and signing in as one of your users.

Roosevelt marks the cookie HTTPS only whenever the visitor is actually on HTTPS, and works that out per request rather than guessing once at startup. That covers both an app serving HTTPS itself and an app whose web server serves HTTPS on its behalf. It relies on `trustProxy` being right, since a request that came through a web server looks like plain HTTP until your app is told to read the headers describing the visitor.

If your app is reachable over plain HTTP, the cookie is not marked, because a cookie that is marked would never be sent and nobody could stay signed in. Roosevelt says so the first time it happens in a production mode:

> Roosevelt is handing out session cookies that are not marked HTTPS only, because requests are reaching this app over plain HTTP.

Running with no encryption anywhere is a legitimate setup for something on a network only you can reach, and the warning is there to be read and dismissed in that case. Anywhere the public can reach your app, treat it as something to fix. The two usual causes are a web server that serves HTTPS but was never told to pass `X-Forwarded-Proto` along, and a `trustProxy` that does not match how many web servers are in front.

