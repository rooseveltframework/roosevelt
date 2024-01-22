// todo: will have to get the windows user to add rsync to their path
// todo: document the windows users to do it (REMOVE RSYNC ENTIRELY)
// call shell
const Logger = require('roosevelt-logger')
const { Glob } = require('glob')
const { exec } = require('child_process')
const fs = require('fs')
const prompts = require('prompts')
const gitignoreScanner = require('./lib/tools/gitignoreScanner')
const gitignoreFiles = gitignoreScanner('./gitignore')
const destDir = process.env.DEST_DIR || process.argv[2]

// const srcDir = __dirname
// const rooseveltPath = `${srcDir}/**/*.js`
// const glob = new Glob(rooseveltPath, { ignore: 'node_modules/**' })
// const globalList = []

class DevSync {
  constructor (destDir) {
    // paths
    this.destDir = destDir
    this.srcDir = __dirname
    this.rooseveltPath = `${this.srcDir}/**/*.js`

    // files to be synced
    this.glob = new Glob(this.rooseveltPath, { ignore: 'node_modules/**' })
    this.globalList = []

    // utils
    this.logger = new Logger()
    this.closeCommands = ['stop', 's']
  }

  init () {
    // gather files to be synced
    for (const file of this.glob) {
      if (!gitignoreFiles.includes(file)) {
        this.globalList.push(file)
      }
    }

    // run prompt
    this.prompt()
  }

  async prompt () {
    try {
      if (this.destDir === '' || this.destDir === undefined) { // no destination set
        const response = await prompts({
          type: 'text',
          name: 'path',
          message: 'Enter the path to your Roosevelt app:',
          validate: value => {
            if (this.closeCommands.includes(value.toLowerCase())) {
              this.close()
            } else {
              return fs.existsSync(value) ? true : 'value must be a valid path'
            }
          }
        })

        this.destDir = response.path
        this.close(this.destDir)
      } else if (!fs.existsSync(this.destDir)) { // destination doesn't exist
        this.error(`Provided path (${this.destDir}) doesn't exist.\n\n`)
      } else if (this.destDir === this.srcDir) { // destination is the same as source, log error
        this.error(`Destination path (${this.destDir}) is the same path as source path (${this.srcDir}). The destination must be a different directory than the source.`)
      } else { // destination found
        const destinationPackage = fs.existsSync(`${this.destDir}/package.json`) && JSON.parse(fs.readFileSync(`${this.destDir}/package.json`, 'utf-8'))

        // validate that destination is a roosevelt application
        const checks = [
          // is a node project
          {
            result: fs.existsSync(`${this.destDir}/package.json`),
            errorMsg: 'The destination does not appear to be a NodeJS project.'
          },
          // has roosevelt as a dependency
          {
            result: (destinationPackage && Object.keys(destinationPackage.dependencies).includes('roosevelt')) || false,
            errorMsg: 'The destination does not appear to have Roosevelt included as a dependency.'
          },
          // has node_modules/roosevelt/
          {
            result: fs.existsSync(`${this.destDir}/node_modules/roosevelt/`),
            errorMsg: 'The destination does not appear to have a Roosevelt folder in the node_modules folder.'
          }
        ]

        if (Object.values(checks).every(check => check.result)) {
          // destination is a valid roosevelt app
          this.watch()
        } else {
          // destination does not contain required roosevelt files
          this.error(`Destination is not a valid Roosevelt application. Ensure the path leads to a valid Roosevelt app.\n\nSee verification results for more info:\n > ${checks.filter(check => !check.result).map(check => check.errorMsg).join('\n > ')}\n`)
        }
      }
    } catch (err) {
      this.error(err)
    }
  }

  error (err) {
    this.logger.error(err)
    this.destDir = ''
    this.prompt()
  }

  async watch () {
    const { default: Watcher } = await import('watcher')
    const watcher = new Watcher(this.globalList, { recursive: true })

    watcher.on('error', error => this.logger.err(error))

    watcher.on('ready', async () => {
      this.logger.info('📁', `Now watching: ${this.srcDir}`)
      this.logger.info('🔗', `Will sync to: ${this.destDir}/node_modules/roosevelt/`)

      const response = await prompts({
        type: 'text',
        name: 'input',
        message: 'Stop dev sync ["stop"/"s"]',
        validate: value => this.closeCommands.includes(value.toLowerCase())
          ? true
          : 'Invalid command. Type "stop" or "s" to stop dev sync'
      })

      if (response.input === undefined || this.closeCommands.includes(response.input.toLowerCase())) {
        await this.close('exit')
      }
    })

    watcher.on('change', () => {
      const cmd = `rsync -avz --delete --exclude=.DS_Store ${this.srcDir}/ ${this.destDir}/node_modules/roosevelt/`

      exec(cmd, (err, stdio, sterr) => {
        err && this.logger.error(err)
        sterr && this.logger.error(sterr)

        if (stdio) {
          this.logger.info(`\n📝 Updating > ${this.destDir}/node_modules/roosevelt\n`)
          this.logger.info(stdio)
        }
      })
    })
  }

  async close (destDir) {
    if (destDir === undefined || destDir.toLowerCase() === 'exit' || destDir.toLowerCase() === 'close') {
      this.logger.info('🛑', 'Closing dev sync')
      process.exit()
    } else {
      this.prompt()
    }
  }
}

const devSync = new DevSync(destDir)
devSync.init()

/*
// gather files that will be synced
for (const file of glob) {
  if (!gitignoreFiles.includes(file)) {
    globalList.push(file)
  }
}

const pathQuestion = {
  type: 'text',
  name: 'destDir',
  message: 'Enter the path to your Roosevelt app:',
  validate: value => fs.existsSync(value) ? true : 'value must be a valid path'
}

// begin script, ask for destination if non-existent
async function promptSetup (destDir) {
  this.logger = new Logger()

  try {
    if (destDir === '' || destDir === undefined) {
      // no destination is set
      const response = await prompts(pathQuestion)
      destDir = response.destDir
      fsClose(destDir)
    } else if (!fs.existsSync(destDir)) {
      this.logger.error(`Provided path (${destDir}) doesn't exist.\n\n`)
      promptSetup()
    } else if (destDir === srcDir) {
      // destination is the same as source, log error
      this.logger.error(`Destination path (${destDir}) is the same path as source path (${srcDir}). The destination must be a different directory than the source.`)
      promptSetup()
    } else {
      const destinationPackage = fs.existsSync(`${destDir}/package.json`)
        ? JSON.parse(fs.readFileSync(`${destDir}/package.json`, 'utf-8'))
        : false

      // validate that destination is a roosevelt application
      const checks = {
        isNode: fs.existsSync(`${destDir}/package.json`),
        hasRooseveltAsDep: (destinationPackage && Object.keys(destinationPackage.dependencies).includes('roosevelt')) || false,
        hasNodeModuleFolder: fs.existsSync(`${destDir}/node_modules/roosevelt/`)
      }

      if (Object.values(checks).every(check => check)) {
        // destination is a valid roosevelt app
        fsWatch(destDir)
      } else {
        // destination does not contain required roosevelt files
        // todo: make this more human readable
        // todo: i.e. - "destination does not appear to be a node project" etc.
        this.logger.error('Destination is not a valid Roosevelt application. Ensure the path leads to a valid Roosevelt app.\n\nSee verification results for more info:\n', checks, '\n')

        promptSetup()
      }
    }
  } catch (err) { console.log(err) }
}

// updates destination directory with updated files
async function fsWatch (destDir) {
  this.logger = new Logger()
  const watch = await import('watcher')
  const Watcher = watch.default
  const watcher = new Watcher(globalList, { recursive: true })

  watcher.on('error', error => this.logger.err(error))

  watcher.on('ready', async () => {
    this.logger.info('📁', `Now watching: ${srcDir}`)
    this.logger.info('🔗', `Will sync to: ${destDir}/node_modules/roosevelt/`)

    const closeCommands = ['stop', 's']
    const response = await prompts({
      type: 'text',
      name: 'input',
      message: 'Stop dev sync ["stop"/"s"]',
      validate: value => closeCommands.includes(value.toLowerCase())
        ? true
        : 'Invalid command. Type "stop" or "s" to stop dev sync'
    })

    if (response.input === undefined || closeCommands.includes(response.input.toLowerCase())) {
      await fsClose('exit')
    }
  })

  watcher.on('change', filePath => {
    const roosevelt = filePath.split('roosevelt')[1]

    // todo: see todo's at top
    const rsync = new Rsync()
      .flags('avz')
      .delete()
      .exclude('.DS_Store')
      .source(filePath)
      .destination(destDir + '/node_modules/roosevelt/' + roosevelt)
    rsync.execute(function (error, _code, _cmd) {
      if (error) this.logger.error(`ERROR: ${error.message}`)
    })
  })
}

// end script
async function fsClose (destDir) {
  if (destDir === undefined || destDir.toLowerCase() === 'exit' || destDir.toLowerCase() === 'close') {
    this.logger.info('🛑', 'Closing fswatch')
    process.exit()
  } else {
    promptSetup(destDir)
  }
}

// promptSetup(destDir)
*/
