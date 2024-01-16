const DEST_DIR = process.env.DEST_DIR || process.argv[2]
const Rsync = require('rsync')
const Logger = require('roosevelt-logger')
const SRC_DIR = __dirname
const fs = require('fs')
const { Glob } = require('glob')
const prompts = require('prompts')
const rosvltPath = `${SRC_DIR}/**/*.js`
const gitignoreScanner = require('./lib/tools/gitignoreScanner')
const gitignoreFiles = gitignoreScanner('./gitignore')
const glob = new Glob(rosvltPath, { ignore: 'node_modules/**' })
const globalList = []

for (const file of glob) {
  if (!gitignoreFiles.includes(file)) {
    globalList.push(file)
  }
}

const pathQuestion = {
  type: 'text',
  name: 'DEST_DIR',
  message: 'Enter the path to your roosevelt app:',
  validate: value => fs.existsSync(value) ? true : 'value must be a valid path'
}

// begin script, ask for destination if non-existent
function promptSetup (DEST_DIR) {
  this.logger = new Logger()

  try {
    if (DEST_DIR === '' || DEST_DIR === undefined) {
      // no destination is set
      this.logger.warn('Destination directory has not been set.\n\n')
      this.logger.info('ℹ️', 'You can set the destination directory path in an environment variable (DEST_DIR) to avoid this step.\n')

      ;(async () => {
        const response = await prompts(pathQuestion)
        DEST_DIR = response.DEST_DIR
        fsClose(DEST_DIR)
      })()
    } else if (!fs.existsSync(DEST_DIR)) {
      this.logger.error(`Provided path (${DEST_DIR}) is not valid.\n\n`)

      ;(async () => {
        const response = await prompts(pathQuestion)
        DEST_DIR = response.DEST_DIR
        fsClose(DEST_DIR)
      })()
    } else if (DEST_DIR === SRC_DIR) {
      // destination is the same as source, log error
      this.logger.error('ERROR: DEST_DIR is pointing to the same path as SRC_DIR ')
    } else {
      const destinationPackage = fs.existsSync(`${DEST_DIR}/package.json`)
        ? JSON.parse(fs.readFileSync(`${DEST_DIR}/package.json`, 'utf-8'))
        : false

      // validate that destination is a roosevelt application
      const checks = {
        isNode: fs.existsSync(`${DEST_DIR}/package.json`),
        hasRooseveltAsDep: (destinationPackage && Object.keys(destinationPackage.dependencies).includes('roosevelt')) || false,
        hasNodeModuleFolder: fs.existsSync(`${DEST_DIR}/node_modules/roosevelt/`)
      }

      if (checks.isNode && checks.hasNodeModuleFolder && checks.hasRooseveltAsDep) {
        // destination is a valid roosevelt app
        this.logger.info('✅', 'Destination found and verified, creating symlink...')
        fsWatch(DEST_DIR)
      } else {
        // destination does not contain required roosevelt files
        this.logger.error('Destination is not a valid roosevelt application! Ensure the path leads to a valid roosevelt app.\n\nSee verification results for more info:\n', checks, '\n')

        ;(async () => {
          const response = await prompts(pathQuestion)
          DEST_DIR = response.DEST_DIR
          fsClose(DEST_DIR)
        })()
      }
    }
  } catch (err) { console.log(err) }
}

// updates destination directory with updated files
async function fsWatch (DEST_DIR) {
  this.logger = new Logger()
  const watch = await import('watcher')
  const Watcher = watch.default
  const watcher = new Watcher(globalList, { recursive: true })

  watcher.on('error', error => this.logger.err(error))

  watcher.on('ready', () => this.logger.info(`

💭 Roosevelt fswatch rsync tool running...

💭 Now watching: ${SRC_DIR}
💭 Will copy to: ${DEST_DIR}/node_modules/roosevelt/`))

  watcher.on('change', filePath => {
    const rosvlt = filePath.split('roosevelt')[1]
    const rsync = new Rsync()
      .flags('avz')
      .delete()
      .exclude('.DS_Store')
      .source(filePath)
      .destination(DEST_DIR + '/node_modules/roosevelt/' + rosvlt)

    rsync.execute(function (error, _code, _cmd) {
      if (error) this.logger.error(`ERROR: ${error.message}`)
    })
  })

  ;(async () => {
    const closeCommands = ['stop', 's']
    const response = await prompts({
      type: 'text',
      name: 'INPUT',
      message: 'Type "stop" or "s" to stop dev sync',
      validate: value => closeCommands.includes(value.toLowerCase())
        ? true
        : 'Invalid command! Type "stop" or "s" to stop dev sync'
    })

    if (response.INPUT === undefined || closeCommands.includes(response.INPUT.toLowerCase())) {
      this.logger.info('💭', 'Closing fswatch')
      watcher.close()
      process.exit()
    }
  })()
}

// end script
async function fsClose (DEST_DIR) {
  if (DEST_DIR === undefined || DEST_DIR.toLowerCase() === 'exit' || DEST_DIR.toLowerCase() === 'close') {
    this.logger.info('💭', 'Closing fswatch')
    process.exit()
  } else {
    promptSetup(DEST_DIR)
  }
}

promptSetup(DEST_DIR)
