// lists the files inside a directory that match a glob, skipping anything the blocklist matches
const fs = require('fs')
const path = require('path')

module.exports = (pattern, cwd, blocklist = []) => {
  return fs.globSync(pattern, { cwd, exclude: [...blocklist], withFileTypes: true })
    .filter(entry => entry.isFile()) // directories match globs too, and only files belong in a bundle
    .map(entry => path.relative(cwd, path.join(entry.parentPath, entry.name))) // paths come back split into a folder and a name, and the rest of the code wants them relative to the folder being searched
    .sort() // files come back in whatever order the filesystem lists them, so sorting keeps a bundle from changing order between machines
}
