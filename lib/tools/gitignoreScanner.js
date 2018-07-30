// Module for scanning the .gitignore and constructing a list of files to ignore
const fs = require('fs')
const path = require('path')

module.exports = function (gitignorePath) {
  let fileList = ['lib-cov', 'node_modules', 'pids', 'logs', 'results', 'Thumbs.db', '*.seed', 'npm-debug.log', '.build', 'public', '*.log', '*.csv', '*.dat', '*.out', '*.pid', '*.gz', '.DS_Store']
  let gitData
  let polishedList = []

  try {
    // ensure that we can access .gitignore
    fs.accessSync(gitignorePath)
  } catch (e) {
    // if we can not, return list of defaults
    return fileList
  }

  // get data from .gitignore, trim it of whitespace, split at new lines
  gitData = fs.readFileSync(gitignorePath).toString().split('\n')

  // skip lines already in fileList as well as blank lines/comments
  gitData.forEach((line) => {
    line = line.trim()
    if (!fileList.includes(line)) {
      if (line !== '' && !line.startsWith('#') && !line.endsWith('.js') && !line.endsWith('.css') && !line.endsWith('.less') && !line.endsWith('.sass') && !line.endsWith('.scss') && !line.endsWith('.jsx')) {
        fileList.push(line)
      }
    }
  })

  // apply basename to each line
  fileList.forEach((file) => {
    if (file.startsWith('*')) {
      let ext = file.split('*')
      polishedList.push(path.basename(ext[1]))
    } else {
      polishedList.push(path.basename(file))
    }
  })
  return polishedList
}
