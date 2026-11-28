// the debug panel error pages show in development mode: the error if there is one, the route list, and the parts of the request's err, req, and res objects worth debugging with, flattened into a script for the browser's console
//
// it is built for one request only when an error page is about to be shown, and kept on that request's res.locals.debugMarkup, where the default error pages read it and an app's own can too
//
// only the parts listed below are shown, rather than everything the objects reach. the whole of req and res reaches the session store's database client and its password, the https server's private key, the app's settings, and so on, and development mode serves the page to anyone on the network who asks for a url that does not exist

const escapeHtml = require('./escapeHtml')

function flattenObject (obj, parent = '', res = {}, visited = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') {
    res[parent] = obj
    return res
  }
  if (visited.has(obj)) {
    res[parent] = '[Circular]'
    return res
  }
  visited.add(obj)
  const properties = Object.getOwnPropertyNames(obj) // get both enumerable and non-enumerable properties
  if (properties.length === 0) { // if the object is empty, we should still add it to the result
    res[parent] = {}
    return res
  }
  for (const key of properties) {
    const propName = parent ? `${parent}.${key}` : key
    const value = obj[key]
    if (typeof value === 'object' && value !== null) flattenObject(value, propName, res, visited)
    else res[propName] = value
  }
  return res
}

// request headers that carry credentials, which a page anyone can be sent to should not repeat
const secretRequestHeaders = ['cookie', 'authorization', 'proxy-authorization']

function withoutKeys (obj, keys) {
  const copy = {}
  for (const key of Object.keys(obj || {})) if (!keys.includes(key.toLowerCase())) copy[key] = obj[key]
  return copy
}

// reads a property without letting one that throws, such as a getter, stop the panel being built
function read (obj, key) {
  try {
    return obj[key]
  } catch (err) {
    return `[could not be read: ${err.message}]`
  }
}

function pickRequest (req) {
  const picked = {}
  for (const key of ['method', 'url', 'originalUrl', 'baseUrl', 'path', 'params', 'query', 'body', 'ip', 'protocol', 'hostname', 'httpVersion']) picked[key] = read(req, key)
  picked.headers = withoutKeys(req.headers, secretRequestHeaders)
  return picked
}

function pickResponse (res) {
  return {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    headers: withoutKeys(res.getHeaders(), ['set-cookie']),
    locals: withoutKeys(res.locals, ['debugmarkup'])
  }
}

function pickError (err) {
  if (err === null || typeof err !== 'object') return { value: err }
  const picked = {}
  for (const key of ['name', 'message', 'stack', 'code', 'status', 'statusCode']) if (err[key] !== undefined) picked[key] = err[key]
  for (const key of Object.keys(err)) if (err[key] === null || typeof err[key] !== 'object') picked[key] = err[key]
  return picked
}

// a value as a javascript literal that is safe inside a <script> element, which ends at the first </script> whatever javascript says
function scriptLiteral (value) {
  return JSON.stringify(flattenObject(value), (key, value) => typeof value === 'bigint' ? value.toString() : value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function build (req, res, err) {
  const objects = err ? '<code>err</code> (error), <code>req</code> (request), and <code>res</code> (response)' : '<code>req</code> (request) and <code>res</code> (response)'
  let markup = ''
  if (err) {
    markup += `<h2>This request failed because there was an error in the Express server</h2>
<p>Error message: ${escapeHtml(err.message)}</p>
<pre>Stack trace: ${escapeHtml(err.stack)}</pre>
`
  }
  markup += `<p>To debug, you can inspect the context of this request by opening the browser developer tools, then typing code in the JavaScript console to examine the contents of the ${objects} objects.</p>
<script>
${err ? `  const err = ${scriptLiteral(pickError(err))}\n` : ''}  const req = ${scriptLiteral(pickRequest(req))}
  const res = ${scriptLiteral(pickResponse(res))}
</script>
<p>Route list:</p><ul>`
  for (const route of req.app.get('routes') || []) markup += `<li>${escapeHtml(route.path)} (${escapeHtml(route.methods)})</li>`
  markup += '</ul>'
  return markup
}

// sets res.locals.debugMarkup for the error page about to be shown, in development mode only
//
// the mode is the app's own rather than NODE_ENV's, which another app in the same process can change
module.exports = (req, res, err) => {
  if (req.app.get('env') !== 'development') return
  try {
    res.locals.debugMarkup = build(req, res, err)
  } catch (error) {
    req.app.get('logger')?.error('Could not build the debug markup for an error page:', error)
  }
}
