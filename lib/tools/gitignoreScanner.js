// Module for scanning the .gitignore and constructing a list of files to ignore
const fse = require('fs-extra')
const path = require('path')

module.exports = function (gitignorePath) {
  const fileList = ['lib-cov', 'node_modules', 'pids', 'logs', 'results', 'Thumbs.db', 'npm-debug.log', '.build', 'public', '.DS_Store']
  const polishedList = []

  try {
    // ensure that we can access .gitignore
    fse.accessSync(gitignorePath)
  } catch (e) {
    // if we can not, return list of defaults
    return fileList
  }

  // get data from .gitignore, trim it of whitespace, split at new lines
  const gitData = fse.readFileSync(gitignorePath).toString().split(/\r?\n/)

  // skip lines already in fileList as well as blank lines/comments
  gitData.forEach((line) => {
    line = line.trim()
    if (!fileList.includes(line)) {
      if (line !== '' && !line.startsWith('#') && !line.endsWith('.js') && !line.endsWith('.css') && !line.endsWith('.less') && !line.endsWith('.sass') && !line.endsWith('.scss') && !line.endsWith('.jsx') && !line.endsWith('.coffee') && !line.endsWith('.litcoffee') && !line.endsWith('.ts') && !line.endsWith('.tsx')) {
        fileList.push(line)
      }
    }
  })

  // apply basename to each line
  fileList.forEach((file) => {
    if (file.includes('*')) {
      // ignore lines that start with *
    } else {
      polishedList.push(path.basename(file))
    }
  })
  return polishedList
}
