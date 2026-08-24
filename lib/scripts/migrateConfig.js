#!/usr/bin/env node
// converts an app's old JSON based roosevelt config into the js config roosevelt now reads
//
// it handles the three places a config used to live: rooseveltConfig.json, roosevelt.config.json, and a rooseveltConfig key inside package.json
// values that used the old `${...}` template syntax are rewritten as refs, which is the replacement for referring to a param roosevelt works out for itself
const fs = require('fs-extra')
const path = require('path')

const appDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd()

let usedRef = false

// turns "${js.sourcePath}/main.js" into a ref, and leaves plain strings alone
function convert (value) {
  if (Array.isArray(value)) return value.map(convert)
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value)) out[key] = convert(value[key])
    return out
  }
  if (typeof value !== 'string' || !value.includes('${')) return value

  usedRef = true
  // the whole string becomes a template literal inside the ref, with every ${x} pointed at the params object
  const body = value.replace(/\$\{([^}]+)\}/g, (_, expr) => '${param.' + expr.trim() + '}')
  return { __ref: '`' + body + '`' }
}

// prints the converted config as javascript source, unwrapping the ref markers into real calls
function print (value, indent = '') {
  if (value && typeof value === 'object' && typeof value.__ref === 'string') return `rooseveltConfig.ref(param => ${value.__ref})`
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    return '[\n' + value.map(v => indent + '  ' + print(v, indent + '  ')).join(',\n') + '\n' + indent + ']'
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value)
    if (!keys.length) return '{}'
    return '{\n' + keys.map(k => indent + '  ' + (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)) + ': ' + print(value[k], indent + '  ')).join(',\n') + '\n' + indent + '}'
  }
  // single quotes so the generated file matches the style most roosevelt apps lint with
  if (typeof value === 'string' && !value.includes("'") && !value.includes('\\')) return "'" + value + "'"
  return JSON.stringify(value)
}

// every place a config could live, listed from lowest precedence to highest, matching the order roosevelt used to read them in
// only one of the two config files was ever read, with rooseveltConfig.json winning, but a rooseveltConfig key in package.json was read as well as a file
// so an app could have params spread across both, and merging them is what keeps those params from being dropped here
const sources = [
  { file: 'package.json', label: 'the rooseveltConfig key in package.json', read: () => fs.readJsonSync(path.join(appDir, 'package.json')).rooseveltConfig },
  { file: 'roosevelt.config.json', label: 'roosevelt.config.json', read: () => fs.readJsonSync(path.join(appDir, 'roosevelt.config.json')) },
  { file: 'rooseveltConfig.json', label: 'rooseveltConfig.json', read: () => fs.readJsonSync(path.join(appDir, 'rooseveltConfig.json')) }
]

// later sources win, and objects are merged rather than replaced, so a param set in only one place survives
function merge (into, from) {
  for (const key of Object.keys(from)) {
    const value = from[key]
    if (value && typeof value === 'object' && !Array.isArray(value) && into[key] && typeof into[key] === 'object' && !Array.isArray(into[key])) merge(into[key], value)
    else into[key] = value
  }
  return into
}

const found = []
let config = {}
for (const source of sources) {
  try {
    const read = source.read()
    if (read && Object.keys(read).length) {
      found.push(source)
      config = merge(config, read)
    }
  } catch {
    // a source that is not there is simply not one of the places this app kept its config
  }
}

if (!found.length) {
  console.log(`No JSON config found in ${appDir}. Nothing to migrate.`)
  process.exit(0)
}

const dest = path.join(appDir, 'roosevelt.config.js')
if (fs.pathExistsSync(dest)) {
  console.error(`${dest} already exists. Move it aside before running this again.`)
  process.exit(1)
}

const converted = convert(config)
const lines = []
if (usedRef) lines.push("const rooseveltConfig = require('roosevelt/config')", '')
lines.push('module.exports = ' + print(converted), '')
fs.writeFileSync(dest, lines.join('\n'))

console.log(`Migrated ${found.map(source => source.label).join(' and ')} to roosevelt.config.js`)
if (usedRef) console.log('Some values used the old template syntax and are now refs. Check them: a ref receives the finished params, so anything it reads is the value roosevelt actually uses.')
console.log(`You can now delete ${found.map(source => source.label).join(' and ')}.`)
