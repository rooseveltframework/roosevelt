const Logger = require('roosevelt-logger')
const { execSync } = require('child_process')
const fs = require('fs-extra')
const path = require('path')
const prompts = require('prompts')
const gitignoreScanner = require('./lib/tools/gitignoreScanner')
const gitignoreFiles = gitignoreScanner('./.gitignore')

// paths
let destDir = process.env.ROOSEVELT_DEST_DIR || process.argv[2]
const srcDir = __dirname

// files to be synced
// the search runs from srcDir so that the exclude below is matched against paths inside roosevelt rather than the whole filesystem path
const globalList = fs.globSync('**/*.js', { cwd: srcDir, exclude: ['node_modules/**'] })
  .map(file => path.join(srcDir, file))
  .filter(file => !gitignoreFiles.includes(file))

// utils
const logger = new Logger()
const closeCommands = ['stop', 's']

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
            return fs.pathExistsSync(value) ? true : 'value must be a valid path'
          }
        }
      })

      destDir = response.path

      // pass user to close in case they wish to stop the program
      fsClose(destDir)
    } else if (!fs.pathExistsSync(destDir)) { // destination doesn't exist
      fsError(`Provided path (${destDir}) doesn't exist.\n\n`)
    } else if (destDir === srcDir) { // destination is the same as source, log error
      fsError(`Destination path (${destDir}) is the same path as source path (${srcDir}). The destination must be a different directory than the source.`)
    } else { // destination found
      const destinationPackage = fs.pathExistsSync(`${destDir}/package.json`) && JSON.parse(fs.readFileSync(`${destDir}/package.json`, 'utf-8'))

      // validate that destination is a roosevelt application
      const checks = [
        // is a node project
        {
          result: fs.pathExistsSync(`${destDir}/package.json`),
          errorMsg: 'The destination does not appear to be a NodeJS project.'
        },
        // has roosevelt as a dependency
        {
          result: (destinationPackage && Object.keys(destinationPackage.dependencies).includes('roosevelt')) || false,
          errorMsg: 'The destination does not appear to have Roosevelt included as a dependency.'
        },
        // has node_modules/roosevelt/
        {
          result: fs.pathExistsSync(`${destDir}/node_modules/roosevelt/`),
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
    sync(destDir)

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

  watcher.on('change', () => sync(destDir))
}

function sync (destDir) {
  // files/directories we don't want to include in sync
  // node_modules is dropped from the ignore lists because we want the dependencies to come along
  // it has to be filtered out of both lists rather than just the directory one, since reading a .gitignore appends every line it contains to whichever list was asked for, so node_modules ends up in each
  const keepNodeModules = entry => entry !== 'node_modules'
  const ignoredDirectories = gitignoreScanner('./.gitignore', 'dir').filter(keepNodeModules)
  const ignoredFiles = gitignoreScanner('./.gitignore', 'file').filter(keepNodeModules)

  const command = syncCommand({ srcDir, destDir, isWindows: process.platform === 'win32', ignoredDirectories, ignoredFiles })

  // execute command
  try {
    execSync(command, { stdio: 'inherit' })
    logger.info(`\n📝 Updating > ${destDir}/node_modules/roosevelt\n`)
    linkBins(destDir)
  } catch (stdout) {
    // node thinks that any status other than 0 is an error - robocopy returns a 0 if no files changes and 1 if files were changed and copied
    // any value greater than/equal to 8 indicates at least one failure during the copy operation
    // see https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/robocopy#exit-return-codes
    if (stdout.status >= 8) {
      logger.error(stdout.output.toString())
    } else {
      logger.info(`\n📝 Updating > ${destDir}/node_modules/roosevelt\n`)
      linkBins(destDir)
    }
  }
}

// builds the copy command without running it, so what gets excluded and how the paths are quoted can be checked directly
// both have been wrong before in ways nothing complained about: a copy that quietly excludes nothing looks exactly like one that worked
function syncCommand ({ srcDir, destDir, isWindows, ignoredDirectories, ignoredFiles }) {
  // express is the one dependency that is not brought along, because it is a peer dependency that the app being tested supplies for itself
  // copying roosevelt's own copy over would shadow the app's, so the app would silently run roosevelt's express rather than the one it installed, hiding anything that only breaks on the version the app actually uses
  const expressPath = path.join(srcDir, 'node_modules', 'express')

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
    // everything is quoted because a path containing a space would otherwise be read as several arguments, which is common on windows where user folders are often named after a person
    command = `robocopy "${srcDir}" "${path.normalize(destDir + '/node_modules/roosevelt/')}" /mt /e /xd ${ignoredDirectories.map(dir => `"${dir}"`).join(' ')} "${expressPath}" /xf ${ignoredFiles.map(file => `"${file}"`).join(' ')}`
  } else {
    /*
    rsync <flags> <source> <destination>

    -avz:
    -a archive: recursion + preserve everything
    -h human readable:
    -z compress: compresses file data as it is sent to the destination
    --progress: show file progress during transfer
    --delete: delete extraneous files from destination (only for dirs that are being synchronized)
    --exclude: exclude files/dirs
    */
    // one --exclude per pattern rather than the --exclude={a,b} shorthand, because that shorthand is brace expansion, which only bash does
    // node runs these through /bin/sh, which is dash on debian and ubuntu, and dash passes the braces through literally so nothing gets excluded at all
    const excludes = [...ignoredDirectories, ...ignoredFiles, '/node_modules/express'].map(file => `--exclude='${file}'`).join(' ')

    // the paths are quoted because one containing a space would otherwise be read as several arguments
    command = `rsync -ahz --progress --delete ${excludes} '${srcDir}/' '${destDir}/node_modules/roosevelt/'`
  }

  return command
}

// npm creates node_modules/.bin entries when it installs a package, and dev sync copies files without ever running an install
// so an app that installed a roosevelt from before these commands existed has none of them linked, and `npx roosevelt-migrate-config` goes looking on the npm registry instead of in the app
// that makes the commands roosevelt ships the one feature dev sync cannot test, which is exactly the sort of thing dev sync is for, so the links are written here to match what npm would have made
function linkBins (destDir) {
  const binDir = path.join(destDir, 'node_modules', '.bin')
  let bins

  try {
    // read from the copy that was just synced rather than from this repo, so the links always describe what the app actually has
    bins = fs.readJsonSync(path.join(destDir, 'node_modules', 'roosevelt', 'package.json')).bin || {}
  } catch {
    // nothing to link if the synced package.json cannot be read, and the sync itself will have complained already
    return []
  }

  const written = []

  for (const [name, target] of Object.entries(bins)) {
    // every shim points at the script through .bin, so the app keeps working if it is moved
    const posixTarget = path.posix.join('..', 'roosevelt', ...target.split(/[\\/]/))
    const windowsTarget = posixTarget.split('/').join('\\')

    // a shim is only rewritten when it is absent or points somewhere else, so a sync on every keystroke does not churn the filesystem
    const shims = process.platform === 'win32'
      ? {
          [`${name}.cmd`]: `@ECHO off\r\nnode "%~dp0${windowsTarget}" %*\r\n`,
          [`${name}.ps1`]: `#!/usr/bin/env pwsh\nnode "$PSScriptRoot/${posixTarget}" @args\n`,
          // git bash on windows looks for the extensionless one, the same as a posix shell would
          [name]: `#!/bin/sh\nnode "$(dirname "$0")/${posixTarget}" "$@"\n`
        }
      : null

    fs.ensureDirSync(binDir)

    if (shims) {
      for (const [file, contents] of Object.entries(shims)) {
        const shimPath = path.join(binDir, file)
        let existing
        try { existing = fs.readFileSync(shimPath, 'utf8') } catch {}
        if (existing === contents) continue
        fs.outputFileSync(shimPath, contents)
        written.push(file)
      }
    } else {
      const linkPath = path.join(binDir, name)
      let existing
      try { existing = fs.readlinkSync(linkPath) } catch {}
      if (existing === posixTarget) continue
      fs.removeSync(linkPath)
      fs.symlinkSync(posixTarget, linkPath)
      // the scripts carry a shebang, so the exec bit is all that is left for a shell to run them directly
      fs.chmodSync(path.join(destDir, 'node_modules', 'roosevelt', target), 0o755)
      written.push(name)
    }
  }

  if (written.length) logger.info('🔗', `Linked the commands roosevelt ships so npx can find them: ${written.join(', ')}`)

  return written
}

// stop the program
async function fsClose (destDir) {
  if (destDir === undefined || destDir.toLowerCase() === 'exit' || destDir.toLowerCase() === 'close') {
    process.exit()
  } else {
    promptSetup(destDir)
  }
}

// only start when run as a script, so a test can require the pieces above without the prompt taking over the terminal
if (require.main === module) promptSetup(destDir)

module.exports = { linkBins, syncCommand }
