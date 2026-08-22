# HTTP options

- `http` *[Object]*: Parameters for configuring the HTTP server.
  - `enable` *[Boolean]*: Enable HTTP server.
  - `port` *[Number]*: The HTTP port your app will run on.

Default when an app is created manually: *[Object]*

```javascript
{
  enable: true,
  port: 43763
}
```

Default when an app is created with the app generator: *[Object]*

```javascript
{
  enable: false,
  port: 43763
}
```

- `https` *[Object]*: Parameters for configuring the HTTPS server.
  - `enable` *[Boolean]*: Enable HTTPS server.
  - `port` *[Number]*: The port your app will run the HTTPS server on.
  - `autoCert` *[Boolean]*: Will create self-signed HTTPS certificates in development mode as long as they don't already exist.
  - `options` *[Object]*: Configuration that gets passed directly to the HTTPS server instance. Accepts [all native settings](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions). For convenience, the `ca`, `cert`, `key`, and `pfx` params can take file path strings or arrays of file path strings relative to your `secretsPath` in addition to the native strings and buffers.

Default when an app is created manually: *[Object]*

```javascript
{
  enable: false,
  port: 43711,
  autoCert: true,
  options: {}
}
```

Default when an app is created with the app generator: *[Object]*

```javascript
{
  enable: true,
  port: 43711,
  autoCert: true,
  options: {
    cert: 'cert.pem',
    key: 'key.pem'
  }
}
```

