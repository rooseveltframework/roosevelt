module.exports = function (app, err, req, res) {
  let status = err.status || 500
  res.status(status)
  res.send(`
    <!DOCTYPE html>
    <html lang='en'>
      <head>
        <meta charset='utf-8'>
        <meta name='viewport' content='width=device-width,initial-scale=1'>
        <meta name='format-detection' content='telephone=no'>
        <title>${status} Internal Server Error</title>
      </head>
      <body>
        <main>
          <header>
            <h1>${status} Internal Server Error</h1>
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
