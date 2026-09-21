// lists everything under a directory that is not a directory, as absolute paths
//
// this replaced @nodelib/fs.walk with node's own recursive readdir, which has covered this since node 20 and needs no dependency
//
// directories are dropped here rather than by each caller, which is what every one of them already did, some with an lstat per entry; symlinks are kept, because the filters this replaced excluded directories and nothing else
//
// the list is sorted so that a build does not depend on the order a filesystem happens to hand its entries back in, which differs between machines and was never guaranteed before
const fs = require('fs-extra')
const path = require('path')

module.exports = async dir => (await fs.readdir(dir, { recursive: true, withFileTypes: true }))
  .filter(entry => !entry.isDirectory())
  .map(entry => path.join(entry.parentPath, entry.name))
  .sort()
