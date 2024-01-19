const DEST_DIR = process.env.DEST_DIR || process.argv[2]

// todo: test Rsync in windows
// todo: we should manually perform the Rsync
// todo: will have to get the windows user to add rsync to their path
// todo: document the windows users to do it (REMOVE RSYNC ENTIRELY)
// call shell
const Rsync = require('rsync')
const Logger = require('roosevelt-logger')
const SRC_DIR = __dirname
const fs = require('fs')
const { Glob } = require('glob')
const prompts = require('prompts')
const rooseveltPath = `${SRC_DIR}/**/*.js`
const gitignoreScanner = require('./lib/tools/gitignoreScanner')
const gitignoreFiles = gitignoreScanner('./gitignore')
const glob = new Glob(rooseveltPath, { ignore: 'node_modules/**' })
const globalList = []

// todo: convert DEST_DIR and SRC_DIR to camelcase

// todo: remove self-invoked async functions

for (const file of glob) {
  if (!gitignoreFiles.includes(file)) {
    globalList.push(file)
  }
}

const pathQuestion = {
  type: 'text',
  name: 'DEST_DIR',
  message: 'Enter the path to your Roosevelt app:',
  validate: value => fs.existsSync(value) ? true : 'value must be a valid path'
}

// begin script, ask for destination if non-existent
function promptSetup (DEST_DIR) {
  this.logger = new Logger()

  try {
    if (DEST_DIR === '' || DEST_DIR === undefined) {
      // no destination is set
      ;(async () => {
        const response = await prompts(pathQuestion)
        DEST_DIR = response.DEST_DIR
        fsClose(DEST_DIR)
      })()
    } else if (!fs.existsSync(DEST_DIR)) {
      // todo
      this.logger.error(`Provided path (${DEST_DIR}) doesn't exist.\n\n`)

      ;(async () => {
        const response = await prompts(pathQuestion)
        DEST_DIR = response.DEST_DIR
        fsClose(DEST_DIR)
      })()
    } else if (DEST_DIR === SRC_DIR) {
      // destination is the same as source, log error
      // todo: make this clearer - destination has to be a different directory than source, etc.
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
        fsWatch(DEST_DIR)
      } else {
        // destination does not contain required roosevelt files
        // todo: make this more human readable
        // todo: i.e. - "destination does not appear to be a node project" etc.
        this.logger.error('Destination is not a valid Roosevelt application. Ensure the path leads to a valid Roosevelt app.\n\nSee verification results for more info:\n', checks, '\n')

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

  // todo: better emojis
  watcher.on('ready', () => this.logger.info(`
💭 Now watching: ${SRC_DIR}
💭 Will sync to: ${DEST_DIR}/node_modules/roosevelt/`))

  watcher.on('change', filePath => {
    const roosevelt = filePath.split('roosevelt')[1]

    // todo: see todo's at top
    const rsync = new Rsync()
      .flags('avz')
      .delete()
      .exclude('.DS_Store')
      .source(filePath)
      .destination(DEST_DIR + '/node_modules/roosevelt/' + roosevelt)
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
