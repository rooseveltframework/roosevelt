/* eslint-env mocha */

const appCleaner = require('./util/appCleaner')
const appGenerator = require('./util/appGenerator')
const assert = require('assert')
const fs = require('fs-extra')
const path = require('path')

describe('config auditor', () => {
  const appDir = path.join(__dirname, 'app/configAudit')
  let pkgJson
  let configFile

  beforeEach(() => {
    // wipe out contents of package and config file
    pkgJson = {}
    configFile = {}

    // make copies of the default config and scripts
    const sampleContent = JSON.parse(JSON.stringify(require('../lib/defaults/config.json')))
    const scriptContent = JSON.parse(fs.readFileSync(path.join(__dirname, '../lib/defaults/scripts.json')).toString('utf8'))

    // attach default config to sample package.json
    pkgJson.rooseveltConfig = sampleContent

    // attach default scripts to sample package.json
    pkgJson.scripts = {}
    for (const key of Object.keys(scriptContent)) {
      pkgJson.scripts[key] = scriptContent[key].value
    }

    // attach default config to sample rooseveltConfig.json
    configFile = sampleContent
  })

  // wipe out the test app directory after each test
  afterEach(async () => {
    // wipe out the test app directory
    await appCleaner('configAudit')
  })

  it('should start the config audit automatically on first app run', async () => {
    const { execaNode } = await import('execa')

    // generate a sample Roosevelt app
    appGenerator({
      location: 'configAudit',
      method: 'initServer',
      config: {
        mode: 'development',
        csrfProtection: false,
        makeBuildArtifacts: false
      }
    })

    // generate package.json for that Roosevelt app
    fs.writeJSONSync(path.join(appDir, 'package.json'), pkgJson)

    // spin up the app
    const { stdout } = await execaNode(path.join(appDir, 'app.js'))

    // confirm via logging that the audit script started
    assert(stdout.includes('rooseveltConfig audit'), 'Config audit did not start')

    // in this case no errors should have been reported
    assert(!stdout.includes('Issues have been detected'), 'Issues were detected in what should have been a valid config')
  })

  it('should detect and complain about a wide variety of problems in package.json', async () => {
    const { execaNode } = await import('execa')

    // add a whole lot of invalid stuff to a default config
    pkgJson.rooseveltConfig.port = []
    pkgJson.rooseveltConfig.extraParam = true
    pkgJson.rooseveltConfig.bodyParser.extraParam = true
    pkgJson.rooseveltConfig.css.extraParam = true
    pkgJson.rooseveltConfig.errorPages.extraParam = true
    pkgJson.rooseveltConfig.frontendReload.extraParam = true
    pkgJson.rooseveltConfig.htmlValidator.extraParam = true
    pkgJson.rooseveltConfig.logging.extraParam = true
    pkgJson.rooseveltConfig.js.extraParam = true
    pkgJson.rooseveltConfig.js.webpack.extraParam = true

    // write package.json to app directory
    fs.ensureDirSync(path.join(appDir))
    fs.writeJSONSync(path.join(appDir, 'package.json'), pkgJson)

    // spin up the auditor script
    const { stderr } = await execaNode('../../../lib/scripts/configAuditor.js', { cwd: appDir })

    // check stderr to ensure it found all the problems
    assert(stderr.includes('The type of param "port" should be one of the supported types'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.bodyParser,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.css,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.errorPages,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.frontendReload,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.logging,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.htmlValidator,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.js,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.js.webpack,'))
  })

  it('should detect and complain about a missing script', async () => {
    const { execaNode } = await import('execa')

    // delete a script
    delete pkgJson.scripts['audit-config']

    // write package.json to app directory
    fs.ensureDirSync(path.join(appDir))
    fs.writeJSONSync(path.join(appDir, 'package.json'), pkgJson)

    // spin up the auditor script
    const { stderr } = await execaNode('../../../lib/scripts/configAuditor.js', { cwd: appDir })

    // check stderr to ensure it found the problem
    assert(stderr.includes('Missing script "audit-config"'))
  })

  it('should detect and complain about an outdated script', async () => {
    const { execaNode } = await import('execa')

    // botch a script
    pkgJson.scripts['audit-config'] = 'node /roosevelt/lol/wrong/place.js'

    // write package.json to app directory
    fs.ensureDirSync(path.join(appDir))
    fs.writeJSONSync(path.join(appDir, 'package.json'), pkgJson)

    // spin up the auditor script
    const { stderr } = await execaNode('../../../lib/scripts/configAuditor.js', { cwd: appDir })

    // check stderr to ensure it found the problem
    assert(stderr.includes('Detected outdated script "audit-config"'))
  })

  it('should detect and complain about a wide variety of problems in rooseveltConfig.json', async () => {
    const { execaNode } = await import('execa')

    // add a whole lot of invalid stuff to a default config
    configFile.port = []
    configFile.extraParam = true
    configFile.bodyParser.extraParam = true
    configFile.css.extraParam = true
    configFile.errorPages.extraParam = true
    configFile.frontendReload.extraParam = true
    configFile.htmlValidator.extraParam = true
    configFile.logging.extraParam = true
    configFile.js.extraParam = true
    configFile.js.webpack.extraParam = true

    // write rooseveltConfig.json to app directory
    fs.ensureDirSync(path.join(appDir))
    fs.writeJSONSync(path.join(appDir, 'rooseveltConfig.json'), configFile)

    // spin up the auditor script
    const { stderr } = await execaNode('../../../lib/scripts/configAuditor.js', { cwd: appDir })

    // check stderr to ensure it found all the problems
    assert(stderr.includes('The type of param "port" should be one of the supported types'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.bodyParser,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.css,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.errorPages,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.frontendReload,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.logging,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.htmlValidator,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.js,'))
    assert(stderr.includes('Extra param "extraParam" found in rooseveltConfig.js.webpack,'))
  })

  it('should scan and detect problems in both package.json and rooseveltConfig.json', async () => {
    const { execaNode } = await import('execa')

    // add invalid entries to package and config file
    pkgJson.rooseveltConfig.extraParam = true
    configFile.extraParam = true

    // write rooseveltConfig.json to app directory
    fs.ensureDirSync(path.join(appDir))
    fs.writeJSONSync(path.join(appDir, 'package.json'), pkgJson)
    fs.writeJSONSync(path.join(appDir, 'rooseveltConfig.json'), configFile)

    // spin up the auditor script
    const { stderr } = await execaNode('../../../lib/scripts/configAuditor.js', { cwd: appDir })

    // check stderr to ensure it found all the problems
    assert(stderr.includes('Issues have been detected in rooseveltConfig.json'))
    assert(stderr.includes('Issues have been detected in package.json'))
  })
})
