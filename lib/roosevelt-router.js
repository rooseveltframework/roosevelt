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
