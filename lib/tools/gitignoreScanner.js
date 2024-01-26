// Module for scanning the .gitignore and constructing a list of files to ignore
const fs = require('fs-extra')
const path = require('path')

module.exports = function (gitignorePath, type) {
  const directoryList = ['lib-cov', 'node_modules', 'pids', 'logs', 'results', '.build', 'public', '.DS_Store']
  const fileList = ['Thumbs.db', 'npm-debug.log', 'devSync.js']
  const polishedList = []

  let list

  if (type === 'dir') {
    list = directoryList
  } else if (type === 'file') {
    list = fileList
  } else {
    list = [...directoryList, ...fileList]
  }

  try {
    // ensure that we can access .gitignore
    fs.accessSync(gitignorePath)
  } catch (e) {
    return list
  }

  // get data from .gitignore, trim it of whitespace, split at new lines
  const gitData = fs.readFileSync(gitignorePath).toString().split(/\r?\n/)

  // skip lines already in fileList as well as blank lines/comments
  gitData.forEach((line) => {
    line = line.trim()
    if (!list.includes(line)) {
      if (line !== '' && !line.startsWith('#') && !line.endsWith('.js') && !line.endsWith('.css') && !line.endsWith('.less') && !line.endsWith('.sass') && !line.endsWith('.scss') && !line.endsWith('.jsx') && !line.endsWith('.coffee') && !line.endsWith('.litcoffee') && !line.endsWith('.ts') && !line.endsWith('.tsx')) {
        list.push(line)
      }
    }
  })

  // apply basename to each line
  list.forEach((file) => {
    if (file.includes('*')) {
      // ignore lines that start with *
    } else {
      polishedList.push(path.basename(file))
    }
  })

  return polishedList
}
