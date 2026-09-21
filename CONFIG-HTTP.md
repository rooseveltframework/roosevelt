# HTTP options

- `http` *[Object]*: Parameters for configuring the HTTP server.
  - `enable` *[Boolean]*: Enable HTTP server.
  - `port` *[Number]*: The HTTP port your app will run on.

Default when an app is created manually: *[Object]*

```javascript
{
  enable: true,
  port: 11637
}
```

Default when an app is created with the app generator: *[Object]*

```javascript
{
  enable: false,
  port: 11637
}
```

- `https` *[Object]*: Parameters for configuring the HTTPS server.
  - `enable` *[Boolean]*: Enable HTTPS server.
  - `port` *[Number]*: The port your app will run the HTTPS server on.
  - `autoCert` *[Boolean]*: Will create self-signed HTTPS certificates in development mode as long as they don't already exist.
  - `autoCertWarning` *[Boolean]*: Warn on startup when the certificate `autoCert` generated is signed by an authority this machine does not trust, which is the state that makes your browser complain about it. The warning names the commands to install mkcert for your platform. Set this to `false` to silence it outright; leaving it on and setting `logging.quieterStartup` to `true` instead shows it at most once a day.
  - `options` *[Object]*: Configuration that gets passed directly to the HTTPS server instance. Accepts [all native settings](https://nodejs.org/api/tls.html#tlscreatesecurecontextoptions). For convenience, the `ca`, `cert`, `key`, and `pfx` params can take file path strings or arrays of file path strings relative to your `secretsPath` in addition to the native strings and buffers.

Default when an app is created manually: *[Object]*

```javascript
{
  enable: false,
  port: 11437,
  autoCert: true,
  autoCertWarning: true,
  options: {}
}
```

Default when an app is created with the app generator: *[Object]*

```javascript
{
  enable: true,
  port: 11437,
  autoCert: true,
  autoCertWarning: true,
  options: {
    cert: 'cert.pem',
    key: 'key.pem'
  }
}
```

## Trusted certificates in development

When `https.autoCert` is enabled, Roosevelt makes the certificate your app serves in development. What it makes depends on whether you have `mkcert` installed:

- **With mkcert on your PATH and fully set up**, Roosevelt signs with mkcert. The certificate is trusted by your operating system and by Chrome, Firefox, and Safari, and you will not see HTTPS cert warnings.
- **Without it**, Roosevelt signs with a development authority of its own, written into your app's `secretsPath` beside the certificate. The certificate works, but nothing trusts that authority until you say so, so your browser warns about it. Roosevelt writes nothing outside your app, so trusting it covers that one app; installing mkcert is what covers every app at once.

### Installing mkcert

- **Install mkcert and the certificate tools its browser support needs:**

```bash
sudo apt install mkcert libnss3-tools      # Ubuntu
brew install mkcert nss                    # macOS
choco install mkcert                       # Windows
```

- **Trust the authority:** `mkcert -install`
