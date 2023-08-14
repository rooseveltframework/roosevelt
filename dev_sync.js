const Logger = require('roosevelt-logger')
this.logger = new Logger()
const Rsync = require('rsync')
// const DEST_DIR = process.env.DEST_DIR
const DEST_DIR = './../my-roosevelt-sample-app'
const SRC_DIR = __dirname

const rsync = new Rsync()
//   .shell('ssh')
  .flags('avz')
  .delete()
  .exclude('.DS_Store')
  .source(SRC_DIR)
  .destination(`${DEST_DIR}/node_modules/roosevelt/`)

// console.log(rsync)
rsync.execute(function (error, code, cmd) {
  if (error) {
    console.error(`error: ${error.message}`)
  }
})
// const fs = require('fs')
// const watcher = require('watcher')

// async function fsWatch () {
//   const watch = await import('watcher')
//   const Watcher = watch.default

//   const watcher = new Watcher(DEST_DIR)

//   console.log(watcher)
// }

// console.log(`*** DEST_DIR:  ${DEST_DIR}`)
// console.log(fsWatch())

// try {
//   if (DEST_DIR === '') {
//     this.logger.error('ERROR: DEST_DIR is an empty variable')
//   } else if (DEST_DIR === SRC_DIR) {
//     this.logger.error('ERROR: DEST_DIR is pointing to the same path as SRC_DIR ')
//   } else {
//     if (fs.existsSync(`${DEST_DIR}/node_modules/roosevelt/`)) {
//       this.logger.info('💭', 'We are in a Roosevelt app ...')
//       fsWatch()
//     } else {
//       this.logger.info('')
//       this.logger.warn('Make sure the above directories are correct or this could delete unwanted files!')
//       this.logger.info('💭', 'We are not in a Roosevelt app ...')
//       this.logger.info('')
//       fsWatch()
//     }
//   }
// } catch (err) { console.log(err) }

// function fsWatch () {
//   const Logger = require('roosevelt-logger')
//   this.logger = new Logger()
//   const { execSync } = require('child_process')

//   this.logger.info('💭', 'Roosevelt fswatch rsync tool running...')
//   this.logger.info('')
//   this.logger.info('💭', `Now watching: ${SRC_DIR}`)
//   this.logger.info('💭', `Will copy to: ${DEST_DIR}`)
//   this.logger.info('')

//   execSync(`fswatch -0 ${SRC_DIR} | while read -d "" event
//   do
//     rsync -avz --delete --exclude=.DS_Store ${SRC_DIR}/ ${DEST_DIR}/node_modules/roosevelt/
//   done`, (error, stdout, stderr) => {
//     if (error) {
//       console.error(`error: ${error.message}`)
//       return
//     }
//     if (stderr) {
//       console.error(`stderr: ${stderr}`)
//       return
//     }
//     console.log(`stdout:\n${stdout}`)
//   })
// }
