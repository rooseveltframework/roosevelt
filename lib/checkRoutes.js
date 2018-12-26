require('colors')
const fs = require('fs-extra')
const path = require('path')
const logger = require('./tools/logger')()

// Utility module for checking express routes in controllersPath
module.exports = function (app, callback) {
  const controllersPath = app.get('controllersPath')
  let badControllers = []
  let controllerFiles

  // Make sure controllersPath is a directory
  try {
    fs.accessSync(controllersPath)

    // Get all controller files
    controllerFiles = fs.readdirSync(controllersPath)

    // Loop through files and their content
    for (let controller of controllerFiles) {
      let file = path.join(controllersPath, controller)
      let content = fs.readFileSync(file, 'utf8')

      // If no express routes are found (error files may not have an app.route())
      if (!content.match(/\.(render|status|send)*?\(([^)]*)\)/)) {
        badControllers.push(controller)
      }
    }

    // Report bad controller files
    if (badControllers.length > 0) {
      badControllers[0] = '       - ' + badControllers[0]
      badControllers = badControllers.join('\n       - ')
      logger.warn(`There are files without Express routes located in your controllers directory.\n${badControllers}`.yellow)
    }

    callback()
  } catch (e) {
    callback()
  }
}
