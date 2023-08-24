const Logger = require('roosevelt-logger')
this.logger = new Logger()
const Rsync = require('rsync')
const SRC_DIR = __dirname
const fs = require('fs')
const { Glob } = require('glob')
const prompts = require('prompts')

const gitignoreScanner = require('./lib/tools/gitignoreScanner')
const gitignoreFiles = gitignoreScanner('./gitignore')
const glob = new Glob('./../roosevelt/**/*.js', { ignore: 'node_modules/**' })
const globalList = []

for (const file of glob) {
  if (!gitignoreFiles.includes(file)) {
    globalList.push(file)
  }
}
function promptSetup (DEST_DIR) {
  const Logger = require('roosevelt-logger')
  this.logger = new Logger()
  console.log(`process.env.DEST_DIR: ${process.env.DEST_DIR}`)
  DEST_DIR = process.env.DEST_DIR

  try {
    if (DEST_DIR === '' || DEST_DIR === undefined) {
      this.logger.error('ERROR: DEST_DIR is an empty variable')
      const questions = [
        {
          type: 'text',
          name: 'DEST_DIR',
          message: 'Path to Roosevelt Sample App?'
        }
      ];
      (async () => {
        const response = await prompts(questions)
        DEST_DIR = response.DEST_DIR
        if (DEST_DIR === 'exit' || DEST_DIR === 'close') {
          console.log('')
          console.log('💭')
          console.log('💭 Closing fswatch')
          console.log('💭')
          console.log('')
          process.exit()
        } else {
          promptSetup(DEST_DIR)
        }
      })()
    } else if (DEST_DIR === SRC_DIR) {
      this.logger.error('ERROR: DEST_DIR is pointing to the same path as SRC_DIR ')
    } else {
      if (fs.existsSync(`${DEST_DIR}/rooseveltConfig.json`) || fs.existsSync(`${DEST_DIR}/node_modules/roosevelt/`)) {
        fsWatch(DEST_DIR)
      } else {
        this.logger.info('')
        this.logger.warn('Make sure the above directories are correct or this could delete unwanted files!')
        this.logger.info('💭', 'We are not in a Roosevelt app ...')
        this.logger.info('')
        const questions = [
          {
            type: 'text',
            name: 'DEST_DIR',
            message: 'Path to Roosevelt Sample App?'
          }
        ];
        (async () => {
          const response = await prompts(questions)
          DEST_DIR = response.DEST_DIR
          if (DEST_DIR === 'exit' || DEST_DIR === 'close') {
            console.log('')
            console.log('💭')
            console.log('💭 Closing fswatch')
            console.log('💭')
            console.log('')
            process.exit()
          } else {
            promptSetup(DEST_DIR)
          }
        })()
      }
    }
  } catch (err) { console.log(err) }
}

async function fsWatch (DEST_DIR) {
  const Logger = require('roosevelt-logger')
  this.logger = new Logger()
  const watch = await import('watcher')
  const Watcher = watch.default
  const watcher = new Watcher(globalList, { recursive: true })

  watcher.on('error', error => {
    this.logger.err(error)
  })

  watcher.on('ready', () => {
    this.logger.info('')
    this.logger.info('')
    this.logger.info('💭', 'Roosevelt fswatch rsync tool running...')
    this.logger.info('')
    this.logger.info('💭', `Now watching: ${SRC_DIR}`)
    this.logger.info('💭', `Will copy to: ${DEST_DIR}/node_modules/roosevelt/`)
    this.logger.info('')
  })

  watcher.on('change', filePath => {
    const rosvlt = filePath.split('roosevelt')[1]
    const rsync = new Rsync()
      .flags('avz')
      .delete()
      .exclude('.DS_Store')
      .source(filePath)
      .destination(DEST_DIR + '/node_modules/roosevelt/' + rosvlt)

    rsync.execute(function (error, code, cmd) {
      if (error) {
        this.logger.error(`ERROR: ${error.message}`)
      }
    })
  })

  const questions = [
    {
      type: 'text',
      name: 'INPUT',
      message: 'Type "Exit or Close" to end fsWatcher"'
    }
  ];
  (async () => {
    const response = await prompts(questions)
    const input = response.INPUT
    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'close') {
      console.log('')
      console.log('')
      console.log('💭')
      console.log('💭 Closing fswatch')
      console.log('💭')
      watcher.close()
      process.exit()
    }
  })()
}

promptSetup()
