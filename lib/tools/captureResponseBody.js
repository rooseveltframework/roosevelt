// buffers a response body so it can be rewritten before it is sent
//
// derived from the tamper module: https://github.com/fgnass/tamper (MIT, Copyright (c) 2019 Felix Gnass)
//
// it is inlined here rather than depended on because roosevelt used tamper for one thing, and only ever received it as a dependency of something else, which stopped supplying it
//
// `accept` is handed the request and response once the headers are known. returning a function from it captures the body and hands it to that function to rewrite; returning anything falsy lets the response proceed untouched, unbuffered
module.exports = function captureResponseBody (accept) {
  return function (req, res, next) {
    const original = { write: res.write, end: res.end, writeHead: res.writeHead }
    const chunks = []
    let rewrite = null
    let headersSet = false
    let statusMessage

    function restore () {
      res.write = original.write
      res.end = original.end
      res.writeHead = original.writeHead
    }

    // the accept callback needs final headers to make its decision, so force them to be set before any body is written
    function mustCapture () {
      if (!headersSet) res.writeHead(res.statusCode)
      return !!rewrite
    }

    function toBuffer (chunk, encoding) {
      return Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding || 'utf8')
    }

    res.writeHead = function (statusCode, message, headers) {
      if (message !== null && typeof message === 'object') { // the status message is optional
        headers = message
        message = undefined
      }
      this.statusCode = statusCode
      statusMessage = message
      if (Array.isArray(headers)) for (let i = 0; i < headers.length; i += 2) this.setHeader(headers[i], headers[i + 1]) // headers can be a flat array of key value pairs
      else for (const name in headers) this.setHeader(name, headers[name])
      headersSet = true
      this.writeHead = original.writeHead
      rewrite = accept(req, this)
      if (rewrite) return this // hold the headers back until the body has been rewritten and its length is known
      this.write = original.write // nothing to rewrite, so un-patch the response and let it proceed as usual
      this.end = original.end
      return this.writeHead(statusCode, statusMessage)
    }

    res.write = function (chunk, encoding, callback) {
      if (typeof encoding === 'function') {
        callback = encoding
        encoding = undefined
      }
      if (!mustCapture()) return this.write(chunk, encoding, callback)
      if (chunk) chunks.push(toBuffer(chunk, encoding))
      if (callback) process.nextTick(callback)
      return true
    }

    res.end = function (chunk, encoding, callback) {
      if (typeof chunk === 'function') {
        callback = chunk
        chunk = undefined
      } else if (typeof encoding === 'function') {
        callback = encoding
        encoding = undefined
      }
      if (!mustCapture()) return this.end(chunk, encoding, callback)
      if (chunk) chunks.push(toBuffer(chunk, encoding))
      const body = Buffer.concat(chunks).toString()
      const send = (finalBody) => {
        restore()
        this.setHeader('Content-Length', Buffer.byteLength(finalBody)) // the body changed length, so the header it was going to claim is wrong
        this.writeHead(this.statusCode, statusMessage)
        this.end(finalBody, callback)
      }
      // the rewrite is called inside the chain rather than handed to Promise.resolve, so that a rewrite which throws outright is caught here alongside one that rejects; calling it first would let a throw escape res.end and take the process down with the response never sent
      Promise.resolve().then(() => rewrite(body)).then(send, error => { // send the body untouched rather than losing the response if the rewrite fails
        process.emitWarning(error)
        send(body)
      })
      return this
    }

    next()
  }
}
