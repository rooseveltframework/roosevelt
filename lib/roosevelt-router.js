const page = require('page')
const pageExpressMapper = require('page-express-mapper')

module.exports = (params) => {
  if (!params) {
    params = {}
  }
  const templatingSystem = params.templatingSystem
  const templateBundle = params.templateBundle
  if (!params.templatingSystem) {
    console.error('roosevelt-router: You must supply templatingSystem to the params object')
    return
  }
  if (!params.templateBundle) {
    console.error('roosevelt-router: You must supply templateBundle to the params object')
    return
  }
  if (!params.onLoad) {
    // use a teddy-specific template loader by default
    params.onLoad = function () {
      if (this.templatingSystem.teddyConsole) { // check if teddy is loaded
        for (const key in templateBundle) {
          templatingSystem.setTemplate(key, templateBundle[key])
        }
      } else {
        console.error('roosevelt-router: You must define an onLoad method if you do not use teddy as your templating system')
      }
    }
  } else if (typeof params.onLoad !== 'function') {
    console.error('roosevelt-router: onLoad must be a function')
    return
  }
  if (!params.renderMethod) {
    // use a teddy-specific render method by default
    if (params.templatingSystem.teddyConsole) { // check if teddy is loaded
      // replaces entire body tag with the body tag of the new template
      // note: this does not handle partials. it assumes you want to replace the whole page minus the contents of the <head> tag
      const parser = new window.DOMParser()
      params.renderMethod = function (template, model) {
        const newDoc = parser.parseFromString(templatingSystem.render(templateBundle[template], model), 'text/html')
        document.body.innerHTML = newDoc.body.innerHTML
      }
    } else {
      const err = 'roosevelt-router: You must define a renderMethod method if you do not use teddy as your templating system'
      console.error(err)
      params.renderMethod = () => {
        console.error(err)
      }
    }
  } else if (typeof params.renderMethod !== 'function') {
    console.error('roosevelt-router: renderMethod must be a function')
    return
  }

  // map page.js to the express api
  const router = pageExpressMapper({
    renderMethod: params.renderMethod
  })

  // optional require designed to fail silently allowing || chaining
  router.isoRequire = (module) => {
    try {
      return require(module)
    } catch (e) {
      // fail silently by returning a function that does nothing but return false
      return () => {
        return false
      }
    }
  }

  // convenience method for handling form submits to the server in a SPA-friendly way; boilerplate written for you
  router.onSubmit = (cb) => {
    document.addEventListener('submit', function (e) {
      const target = e.target
      const action = target.action.replace(window.location.origin, '')
      const method = target.method
      if (router.stack[action] && router.stack[action][method]) { // do nothing if there is no registered route for handling this form submission
        e.preventDefault() // prevent page reload if there is a registered route for this form submission
        window.fetch(action, { // send fetch to the server
          method: method, // with whatever method is defined in the form element
          headers: {
            'Content-Type': 'application/json' // tell the server it's an API request
          },
          body: JSON.stringify(Object.fromEntries(new window.FormData(target))) // send all the form data as JSON
        })
          .then(response => { // then when we get a response
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.indexOf('application/json') !== -1) {
              return response.json().then(data => { // parse it as JSON if it's data
                cb(e, data) // and delegate dealing with it to a user-defined callback
              })
            } else {
              return response.text().then(text => { // get the raw text if it's not
                cb(e, text) // and delegate dealing with it to a user-defined callback
              })
            }
          })
      }
    })
  }

  // render JSON instead of HTML when content-type is application/json designed to fail silently allowing || chaining
  router.apiRender = () => {
    // always returns false because this is never used client-side but we don't want it to crash when run client-side
    return false
  }

  // declare execution context
  router.backend = router.server = false // for auto detection: Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]' // only node.js has a process variable that is of [[Class]] process https://github.com/iliakan/detect-node
  router.frontend = router.client = true

  // call to start the router
  router.init = () => {
    params.onLoad()
    page()
  }

  return router
}
