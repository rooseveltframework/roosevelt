const Logger = require('roosevelt-logger')
this.logger = new Logger()
const { execSync } = require('child_process')
const path = require('path')
const SRC_DIR = __dirname
// Change path in DEST_DIR to point to the sample apps
const DEST_DIR = path.join(__dirname, './../my-roosevelt-sample-app/')

this.logger.info('💭', 'Roosevelt fswatch rsync tool running...')
this.logger.info('')
this.logger.info('💭', `Now watching: ${SRC_DIR}`)
this.logger.info('💭', `Will copy to: ${DEST_DIR}`)
this.logger.info('')
this.logger.info('💭', 'Make sure the above directories are correct or this could delete unwanted files!')
this.logger.info('')
// Change directory path run git command

execSync(`fswatch -0 ${SRC_DIR} | while read -d "" event
do
  rsync -avz --delete --exclude=.DS_Store ${SRC_DIR}/ ${DEST_DIR}/node_modules/roosevelt/
done`, (error, stdout, stderr) => {
  if (error) {
    console.error(`error: ${error.message}`)
    return
  }
  if (stderr) {
    console.error(`stderr: ${stderr}`)
    return
  }
  console.log(`stdout:\n${stdout}`)
})
