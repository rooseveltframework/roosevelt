require('colors')
const klawSync = require('klaw-sync')
const fs = require('fs-extra')
const path = require('path')
const logger = require('./tools/logger')()

// Utility module for checking express routes in controllersPath
module.exports = function (app, callback) {
  const controllersPath = path.normalize(app.get('controllersPath'))
  let badControllers = []
  let controllerFiles
  let routingContent

  // Make sure controllersPath is a directory
  try {
    fs.accessSync(controllersPath)

    // Get all controller files recursively
    controllerFiles = klawSync(controllersPath)

    // Loop through files and their content
    for (let controller of controllerFiles) {
      if (fs.statSync(controller.path).isFile() && path.extname(controller.path) === '.js') {
        // Get file routing content
        routingContent = fs.readFileSync(controller.path, 'utf8')

        // If no express routes are found, add to list
        if (!routingContent.match(/\.(all|checkout|copy|delete|end|get|head|json|lock|merge|move|param|patch|post|put|redirect|render|route|send|set|status|use)*?\(([^)]*)\)/)) {
          badControllers.push(controller.path)
        }
      }
    }

    // Report bad controller files
    if (badControllers.length > 0) {
      badControllers[0] = '      ' + badControllers[0]
      badControllers = badControllers.join('\n      ')
      logger.warn(`There are files without Express routes located in your controllers directory.\n    Incorrect Controllers:\n${badControllers}`.yellow)
    }

    callback()
  } catch (e) {
    callback()
  }
}
