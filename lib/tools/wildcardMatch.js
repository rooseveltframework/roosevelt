/*
  check if a string matches a wildcard string

  arguments:
    - str: string
    - matchList: string or array of strings

  e.g.
    example rule to match: "dir/*"
    valid strings:
      - "dir/foo" => true
      - "dir/bar" => true
      - "foo"     => false
      - "bar/foo" => false
*/

const path = require('path')
const { minimatch } = require('minimatch')

module.exports = (str, matchList) => {
  if (typeof matchList === 'string') matchList = [matchList]
  for (let rule of matchList) {
    rule = path.normalize(rule).replace(/\\/g, '/') // normalize windows; including normalizing the slashes
    if (minimatch(str, rule)) return true
  }
  return false
}
