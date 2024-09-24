const Logger = require('roosevelt-logger')
const logger = new Logger()
const path = require('path')
const fs = require('fs-extra')

module.exports = appDir => {
  try {
    if (!appDir) {
      if (fs.pathExistsSync(path.join(process.cwd(), 'node_modules')) === false) {
        appDir = process.cwd()
      } else {
        return
      }
    }
    const { dependencies } = require(path.join(appDir, 'package.json'))

    if (dependencies['roosevelt-less']) {
      logger.warn('Deprecated module roosevelt-less detected. The functionality it offered is now provided direcly by the less module. See https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters for information on how to update your configuration.'.bold.red)
    }

    if (dependencies['roosevelt-sass']) {
      logger.warn('Deprecated module roosevelt-sass detected. The functionality it offered is now provided direcly by the sass module. See https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters for information on how to update your configuration.'.bold.red)
    }

    if (dependencies['roosevelt-closure']) {
      logger.warn('Deprecated module roosevelt-closure detected. The functionality it offered is now provided by Roosevelt via webpack. See https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters for information on how to update your configuration.'.bold.red)
    }

    if (dependencies['roosevelt-uglify']) {
      logger.warn('Deprecated module roosevelt-uglify detected. The functionality it offered is now provided by Roosevelt via webpack. See https://github.com/rooseveltframework/roosevelt#configure-your-app-with-parameters for information on how to update your configuration.'.bold.red)
    }
  } catch {}
}
