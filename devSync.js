const Logger = require('roosevelt-logger')
const { Glob } = require('glob')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const prompts = require('prompts')
const gitignoreScanner = require('./lib/tools/gitignoreScanner')
const gitignoreFiles = gitignoreScanner('./gitignore')

// paths
let destDir = process.env.ROOSEVELT_DEST_DIR || process.argv[2]
const srcDir = __dirname
const rooseveltPath = `${srcDir}/**/*.js`

// files to be synced
const glob = new Glob(rooseveltPath, { ignore: 'node_modules/**' })
const globalList = []

// utils
const logger = new Logger()
const closeCommands = ['stop', 's']

// gather files that will be synced
for (const file of glob) {
  if (!gitignoreFiles.includes(file)) {
    globalList.push(file)
  }
}

// begin script, ask for destination if non-existent
async function promptSetup (destDir) {
  try {
    if (destDir === '' || destDir === undefined) { // no destination is set
      const response = await prompts({
        type: 'text',
        name: 'path',
        message: 'Enter the path to your Roosevelt app:',
        validate: value => {
          if (closeCommands.includes(value.toLowerCase())) {
            fsClose()
          } else {
            return fs.existsSync(value) ? true : 'value must be a valid path'
          }
        }
      })

      destDir = response.path

      // pass user to close in case they wish to stop the program
      fsClose(destDir)
    } else if (!fs.existsSync(destDir)) { // destination doesn't exist
      fsError(`Provided path (${destDir}) doesn't exist.\n\n`)
    } else if (destDir === srcDir) { // destination is the same as source, log error
      fsError(`Destination path (${destDir}) is the same path as source path (${srcDir}). The destination must be a different directory than the source.`)
    } else { // destination found
      const destinationPackage = fs.existsSync(`${destDir}/package.json`) && JSON.parse(fs.readFileSync(`${destDir}/package.json`, 'utf-8'))

      // validate that destination is a roosevelt application
      const checks = [
        // is a node project
        {
          result: fs.existsSync(`${destDir}/package.json`),
          errorMsg: 'The destination does not appear to be a NodeJS project.'
        },
        // has roosevelt as a dependency
        {
          result: (destinationPackage && Object.keys(destinationPackage.dependencies).includes('roosevelt')) || false,
          errorMsg: 'The destination does not appear to have Roosevelt included as a dependency.'
        },
        // has node_modules/roosevelt/
        {
          result: fs.existsSync(`${destDir}/node_modules/roosevelt/`),
          errorMsg: 'The destination does not appear to have a Roosevelt folder in the node_modules folder.'
        }
      ]

      if (Object.values(checks).every(check => check.result)) { // destination is a valid roosevelt app
        fsWatch(destDir)
      } else { // destination does not contain required roosevelt files
        fsError(`Destination is not a valid Roosevelt application. Ensure the path leads to a valid Roosevelt app.\n\nSee verification results for more info:\n > ${checks.filter(check => !check.result).map(check => check.errorMsg).join('\n > ')}\n`)
      }
    }
  } catch (err) {
    fsError(err)
  }
}

function fsError (err) {
  logger.error(err)
  destDir = ''
  promptSetup()
}

// updates destination directory with updated files
async function fsWatch (destDir) {
  const { default: Watcher } = await import('watcher')
  const watcher = new Watcher(globalList, { recursive: true })

  watcher.on('error', error => logger.err(error))

  watcher.on('ready', async () => {
    logger.info('📁', `Now watching: ${srcDir}`)
    logger.info('🔗', `Will sync to: ${path.normalize(destDir + '/node_modules/roosevelt/')}`)

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

  watcher.on('change', () => {
    // files/directories we don't want to include in sync
    const ignoredDirectories = gitignoreScanner('./gitignore', 'dir')
    const ignoredFiles = gitignoreScanner('./gitignore', 'file')

    const isWindows = process.platform === 'win32'

    let command

    // rsync/robocopy command
    if (isWindows) {
      /*
        robocopy <source> <destination> <file(s)> <options>

        <files> is left empty, and defaults to *.*

        /mt: multi-threaded, defaults to 8
        /e: copy subdirs, including empty dirs
        /xd: exclude dirs
        /xf: exclude files
      */
      command = `robocopy ${srcDir} ${path.normalize(destDir + '/node_modules/roosevelt/')} /mt /e /xd ${ignoredDirectories.join(' ')} /xf ${ignoredFiles.join(' ')}`
    } else {
      /*
        rsync <flags> <source> <destination>

        -avz:
          -a archive: recursion + preserve everything
          -v verbose: verbose log during transfer
          -z compress: compresses file data as it is sent to the destination
        --delete: delete extraneous files from destination (only for dirs that are being synchronized)
        --exclude: exclude files/dirs
      */
      command = `rsync -avz --delete --exclude={${[...ignoredDirectories, ...ignoredFiles].map(file => `'${file}'`).join(',')}} ${srcDir}/ ${destDir}/node_modules/roosevelt/`
    }

    // execute command
    try {
      execSync(command)
    } catch (stdout) {
      // node thinks that any status other than 0 is an error - robocopy returns a 0 if no files changes and 1 if files were changed and copied
      // any value greater than/equal to 8 indicates at least one failure during the copy operation
      // see https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/robocopy#exit-return-codes
      if (stdout.status >= 8) {
        logger.error(stdout.output.toString())
      } else {
        // log changes to user (list of files changed)
        logger.info(`\n📝 Updating > ${destDir}/node_modules/roosevelt\n`)
        logger.info(stdout.output.toString())
      }
    }
  })
}

// stop the program
async function fsClose (destDir) {
  if (destDir === undefined || destDir.toLowerCase() === 'exit' || destDir.toLowerCase() === 'close') {
    process.exit()
  } else {
    promptSetup(destDir)
  }
}

promptSetup(destDir)
