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
  if (typeof matchList === 'string') {
    matchList = [matchList]
  }
  for (let rule of matchList) {
    rule = path.normalize(rule).replace(/\\/g, '/') // normalize windows; including normalizing the slashes

    // for this solution to work on any string, no matter what characters it has
    const escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1')

    // "."  => find a single character, except newline or line terminator
    // ".*" => matches any string that contains zero or more characters
    rule = rule.split('*').map(escapeRegex).join('.*')

    // "^"  => matches any string with the following at the beginning of it
    // "$"  => matches any string with that in front at the end of it
    rule = '^' + rule + '$'

    // create a regular expression object for matching string
    const regex = new RegExp(rule)

    // returns true if it finds a match, otherwise it returns false
    if (regex.test(str)) {
      return true
    }
  }

  return false
}
