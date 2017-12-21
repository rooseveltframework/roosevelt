module.exports = function (app, req, res) {
  res.setHeader('Connection', 'close')
  res.status(503)
  res.send(`
    <!DOCTYPE html>
    <html lang='en'>
      <head>
        <meta charset='utf-8'>
        <meta name='viewport' content='width=device-width,initial-scale=1'>
        <meta name='format-detection' content='telephone=no'>
        <title>503 Service Unavailable</title>
      </head>
      <body>
        <main>
          <header>
            <h1>503 Service Unavailable</h1>
          </header>
          <p>The requested URL ${req.url} is temporarily unavailable at this time.</p>
          <footer>
            <address>${req.headers['x-forwarded-host'] || req.headers.host}</address>
          </footer>
        </main>
      </body>
    </html>
  `)
}
