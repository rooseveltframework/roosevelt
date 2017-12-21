module.exports = function (app) {
  app.route('*').all(function (req, res) {
    res.status(404)
    res.send(`
      <!DOCTYPE html>
      <html lang='en'>
        <head>
          <meta charset='utf-8'>
          <meta name='viewport' content='width=device-width,initial-scale=1'>
          <meta name='format-detection' content='telephone=no'>
          <title>404 Not Found</title>
        </head>
        <body>
          <main>
            <header>
              <h1>Not Found</h1>
            </header>
            <p>The requested URL ${req.url} was not found on this server.</p>
            <footer>
              <address>${req.headers['x-forwarded-host'] || req.headers.host}</address>
            </footer>
          </main>
        </body>
      </html>
    `)
  })
}
