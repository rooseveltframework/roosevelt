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

module.exports = (str, matchList) => {
  if (typeof matchList === 'string') matchList = [matchList]
  for (let rule of matchList) {
    rule = path.normalize(rule).replace(/\\/g, '/') // normalize windows; including normalizing the slashes

    // the posix version is used on every platform because the rules above are always written with forward slashes; the windows version would also treat a backslash as a separator, which would make a rule match more strings than it was written to match
    if (path.posix.matchesGlob(str, rule)) return true
  }
  return false
}
