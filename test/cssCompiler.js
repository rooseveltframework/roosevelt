/* eslint-env mocha */

const assert = require('assert')
const CleanCSS = require('clean-css')
const fs = require('fs-extra')
const less = require('less')
const path = require('path')
const roosevelt = require('../roosevelt')
const sass = require('sass')
const stylus = require('stylus')

describe('css preprocessors', () => {
  const appDir = path.join(__dirname, 'app/css')
  const appConfig = {
    logging: {
      methods: {
        info: false,
        warn: false,
        error: false
      }
    },
    csrfProtection: false,
    htmlValidator: {
      enable: false
    },
    appDir,
    makeBuildArtifacts: true
  }
  const file1 = `
    body {
      height: 100%;
    }
    h1 {
      font-size: 10px;
    }
  `
  const file2 = `
    #selector {
      height: 100%;
    }
    h1 {
      font-size: 10px;
    }
  `
  const file3 = `
    .body {
      height: 100%;
    }
    h1 {
      font-size: 10px;
    }
  `

  describe('general', () => {
    beforeEach(() => {
      // generate sample static js files
      fs.ensureDirSync(path.join(appDir, 'statics/css/import'))
      fs.writeFileSync(path.join(appDir, 'statics/css/file1.less'), file1)
      fs.writeFileSync(path.join(appDir, 'statics/css/file2.less'), file2)
      fs.writeFileSync(path.join(appDir, 'statics/css/import/file3.less'), file3)
    })

    afterEach(async () => {
      fs.rmSync(path.join(__dirname, 'app'), { recursive: true, force: true })
    })

    it('should compile all static css files including subdirectories', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'production',
        css: {
          compiler: {
            enable: true,
            module: 'less'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()

      assert(fs.pathExistsSync(path.join(appDir, 'public/css/file1.css')))
      assert(fs.pathExistsSync(path.join(appDir, 'public/css/file2.css')))
      assert(fs.pathExistsSync(path.join(appDir, 'public/css/import/file3.css')))
    })

    it('should only compile static css files in the allowlist', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'production',
        css: {
          allowlist: [
            'file1.less',
            'import/file3.less'
          ],
          compiler: {
            enable: true,
            module: 'less'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()

      assert(fs.pathExistsSync(path.join(appDir, 'public/css/file1.css')))
      assert(!fs.pathExistsSync(path.join(appDir, 'public/css/file2.css')))
      assert(fs.pathExistsSync(path.join(appDir, 'public/css/import/file3.css')))
    })

    it('should compile css files in the allowlist with alt destinations set', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'production',
        css: {
          allowlist: [
            'file1.less:compile/main.css',
            'import/file3.less:styles.css'
          ],
          compiler: {
            enable: true,
            module: 'less'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()

      assert(fs.pathExistsSync(path.join(appDir, 'public/css/compile/main.css')))
      assert(fs.pathExistsSync(path.join(appDir, 'public/css/styles.css')))
    })

    it('should minify css in prod mode when enabled', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'production',
        css: {
          compiler: {
            enable: true,
            module: 'less'
          },
          minifier: {
            enable: true
          },
          output: 'css'
        }
      })

      await app.initServer()

      // get contents of built files
      const output1 = fs.readFileSync(path.join(appDir, 'public/css/file1.css'), 'utf8')
      const output2 = fs.readFileSync(path.join(appDir, 'public/css/file2.css'), 'utf8')
      const output3 = fs.readFileSync(path.join(appDir, 'public/css/import/file3.css'), 'utf8')

      // manually minify each file
      const clean1 = new CleanCSS().minify(file1).styles
      const clean2 = new CleanCSS().minify(file2).styles
      const clean3 = new CleanCSS().minify(file3).styles

      // compare them
      assert.deepStrictEqual(output1, clean1)
      assert.deepStrictEqual(output2, clean2)
      assert.deepStrictEqual(output3, clean3)
    })

    it('should disable minification in dev mode', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'development',
        css: {
          compiler: {
            enable: true,
            module: 'less'
          },
          minifier: {
            enable: true
          },
          output: 'css'
        }
      })

      await app.initServer()

      // get contents of built files
      const output1 = fs.readFileSync(path.join(appDir, 'public/css/file1.css'), 'utf8')
      const output2 = fs.readFileSync(path.join(appDir, 'public/css/file2.css'), 'utf8')
      const output3 = fs.readFileSync(path.join(appDir, 'public/css/import/file3.css'), 'utf8')

      // manually minify each file
      const clean1 = new CleanCSS().minify(file1).styles
      const clean2 = new CleanCSS().minify(file2).styles
      const clean3 = new CleanCSS().minify(file3).styles

      // compare them
      assert.notDeepStrictEqual(output1, clean1)
      assert.notDeepStrictEqual(output2, clean2)
      assert.notDeepStrictEqual(output3, clean3)
    })

    it('should disable minification when minify: false', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'production',
        css: {
          compiler: {
            enable: true,
            module: 'less'
          },
          minifier: {
            enable: true
          },
          output: 'css'
        },
        minify: false
      })

      await app.initServer()

      // get contents of built files
      const output1 = fs.readFileSync(path.join(appDir, 'public/css/file1.css'), 'utf8')
      const output2 = fs.readFileSync(path.join(appDir, 'public/css/file2.css'), 'utf8')
      const output3 = fs.readFileSync(path.join(appDir, 'public/css/import/file3.css'), 'utf8')

      // manually minify each file
      const clean1 = new CleanCSS().minify(file1).styles
      const clean2 = new CleanCSS().minify(file2).styles
      const clean3 = new CleanCSS().minify(file3).styles

      // compare them
      assert.notDeepStrictEqual(output1, clean1)
      assert.notDeepStrictEqual(output2, clean2)
      assert.notDeepStrictEqual(output3, clean3)
    })

    it('should disable minification when css.minifier.enable: false', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'production',
        css: {
          compiler: {
            enable: true,
            module: 'less'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()

      // get contents of built files
      const output1 = fs.readFileSync(path.join(appDir, 'public/css/file1.css'), 'utf8')
      const output2 = fs.readFileSync(path.join(appDir, 'public/css/file2.css'), 'utf8')
      const output3 = fs.readFileSync(path.join(appDir, 'public/css/import/file3.css'), 'utf8')

      // manually minify each file
      const clean1 = new CleanCSS().minify(file1).styles
      const clean2 = new CleanCSS().minify(file2).styles
      const clean3 = new CleanCSS().minify(file3).styles

      // compare them
      assert.notDeepStrictEqual(output1, clean1)
      assert.notDeepStrictEqual(output2, clean2)
      assert.notDeepStrictEqual(output3, clean3)
    })

    it('should use custom css compiler method', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'production',
        css: {
          compiler: {
            enable: true
          },
          minifier: {
            enable: false
          },
          output: 'css',
          versionFile: {
            fileName: '_version.less',
            varName: 'appVersion'
          }
        },
        cssCompiler: app => {
          app.set('version', '0.2.0')

          return {
            versionCode: app => {
              return `@coolAppVersion: ${app.get('version')}`
            },
            parse: (app, filePath) => {
              return { css: filePath }
            }
          }
        }
      })

      await app.initServer()

      // get contents of built files
      const versionFile = fs.readFileSync(path.join(appDir, 'statics/css/_version.less'))
      const output1 = fs.readFileSync(path.join(appDir, 'public/css/file1.css'), 'utf8')
      const output2 = fs.readFileSync(path.join(appDir, 'public/css/file2.css'), 'utf8')
      const output3 = fs.readFileSync(path.join(appDir, 'public/css/import/file3.css'), 'utf8')

      assert(versionFile.includes('@coolAppVersion: 0.2.0'))
      assert.deepStrictEqual(output1, path.join(appDir, 'statics/css/file1.less'))
      assert.deepStrictEqual(output2, path.join(appDir, 'statics/css/file2.less'))
      assert.deepStrictEqual(output3, path.join(appDir, 'statics/css/import/file3.less'))
    })
  })

  // less
  describe('less', () => {
    const lessString = `
      @fontSize1: 25px;
      @fontSize2: 15px;
      body {
        height: 100%;
        font-size: @fontSize2;
      }
      h1 {
        font-size: 10px;
        font-size: @fontSize1;
      }
      p1 {
        width: calc((50px * 5px ) - 100px);
        font-size: @fontSize2;
      }
      p2 {

      }
    `

    beforeEach(() => {
      // generate sample static js files
      fs.ensureDirSync(path.join(appDir, 'statics/css'))
      fs.writeFileSync(path.join(appDir, 'statics/css/styles.less'), lessString)

      // generate sample package.json
      fs.writeJsonSync(path.join(appDir, 'package.json'), { version: '0.3.1', rooseveltConfig: {} })
    })

    afterEach(async () => {
      fs.rmSync(path.join(__dirname, 'app'), { recursive: true, force: true })
    })

    it('should compile less source file', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'production',
        css: {
          compiler: {
            enable: true,
            module: 'less'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()

      // manually render less file
      const lessOutput = await less.render(lessString, {})
      const buildOutput = fs.readFileSync(path.join(appDir, 'public/css/styles.css'), 'utf8')

      // compare manual render with roosevelt output file
      assert.deepStrictEqual(lessOutput.css, buildOutput)
    })

    it('should enable source maps in dev mode', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'development',
        css: {
          compiler: {
            enable: true,
            module: 'less'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()
      const buildOutput = fs.readFileSync(path.join(appDir, 'public/css/styles.map'), 'utf8')
      assert(buildOutput.includes('"mappings"'), 'build file is missing source map')
    })

    it('should enable source maps in prod mode with prodSourceMaps param', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'development',
        prodSourceMaps: true,
        css: {
          compiler: {
            enable: true,
            module: 'less'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()
      const buildOutput = fs.readFileSync(path.join(appDir, 'public/css/styles.map'), 'utf8')
      assert(buildOutput.includes('"mappings"'), 'build file is missing source map')
    })

    it('should write a version file when enabled', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'development',
        css: {
          compiler: {
            enable: true,
            module: 'less'
          },
          minifier: {
            enable: false
          },
          output: 'css',
          versionFile: {
            fileName: '_version.less',
            varName: 'appVersion'
          }
        }
      })

      await app.initServer()

      const buildOutput = fs.readFileSync(path.join(appDir, 'statics/css/_version.less'), 'utf8')

      // check that a version file with the correct version code is generated
      assert(buildOutput.includes('@appVersion: \'0.3.1\''), 'version file was not properly generated')
    })
  })

  // sass
  describe('sass', () => {
    const scssString = `
      $fontSize1: 25px;
      $fontSize2: 15px;
      body {
        height: 100%;
        font-size: $fontSize2;
      }
      h1 {
        font-size: 10px;
        font-size: $fontSize1;
      }
      p1 {
        width: calc((50 * 5) - 100)px;
        font-size: $fontSize2;
      }
      p2 {

      }
    `

    beforeEach(() => {
      // generate sample static js files
      fs.ensureDirSync(path.join(appDir, 'statics/css'))
      fs.writeFileSync(path.join(appDir, 'statics/css/styles.scss'), scssString)

      // generate sample package.json
      fs.writeJsonSync(path.join(appDir, 'package.json'), { version: '0.3.1', rooseveltConfig: {} })
    })

    afterEach(async () => {
      fs.rmSync(path.join(__dirname, 'app'), { recursive: true, force: true })
    })

    it('should compile scss source file', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'production',
        css: {
          compiler: {
            enable: true,
            module: 'sass'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()

      // manually render sass file
      const scssOutput = sass.compileString(scssString)
      const buildOutput = fs.readFileSync(path.join(appDir, 'public/css/styles.css'), 'utf8')

      // compare manual render with roosevelt output file
      assert.deepStrictEqual(scssOutput.css.toString(), buildOutput)
    })

    it('should enable source maps in dev mode', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'development',
        css: {
          compiler: {
            enable: true,
            module: 'sass'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()
      const buildOutput = fs.readFileSync(path.join(appDir, 'public/css/styles.map'), 'utf8')
      assert(buildOutput.includes('"mappings"'), 'build file is missing source map')
    })

    it('should enable source maps in prod mode with prodSourceMaps param', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'development',
        prodSourceMaps: true,
        css: {
          compiler: {
            enable: true,
            module: 'sass'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()
      const buildOutput = fs.readFileSync(path.join(appDir, 'public/css/styles.map'), 'utf8')
      assert(buildOutput.includes('"mappings"'), 'build file is missing source map')
    })

    it('should write a version file when enabled', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'development',
        css: {
          compiler: {
            enable: true,
            module: 'sass'
          },
          minifier: {
            enable: false
          },
          output: 'css',
          versionFile: {
            fileName: '_version.scss',
            varName: 'appVersion'
          }
        }
      })

      await app.initServer()

      const buildOutput = fs.readFileSync(path.join(appDir, 'statics/css/_version.scss'), 'utf8')

      // check that a version file with the correct version code is generated
      assert(buildOutput.includes('$appVersion: \'0.3.1\''), 'version file was not properly generated')
    })
  })

  // stylus
  describe('stylus', () => {
    const stylusString = `
      fontSize1 = 25px
      fontSize2 = 15px
      body
        height: 100%
        font-size: fontSize2
      h1
        font-size: 10px
        font-size: fontSize1
      p1
        width: calc((50px * 5px ) - 100px)
        font-size: fontSize2
    `

    beforeEach(() => {
      // generate sample static js files
      fs.ensureDirSync(path.join(appDir, 'statics/css'))
      fs.writeFileSync(path.join(appDir, 'statics/css/styles.styl'), stylusString)

      // generate sample package.json
      fs.writeJsonSync(path.join(appDir, 'package.json'), { version: '0.3.1', rooseveltConfig: {} })
    })

    afterEach(async () => {
      fs.rmSync(path.join(__dirname, 'app'), { recursive: true, force: true })
    })

    it('should compile styl source file', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'production',
        css: {
          compiler: {
            enable: true,
            module: 'stylus'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()

      // manually render styl file
      const stylusOutput = await renderFile()
      const buildOutput = fs.readFileSync(path.join(appDir, 'public/css/styles.css'), 'utf8')

      // compare manual render with roosevelt output file
      assert.deepStrictEqual(stylusOutput.toString(), buildOutput)

      function renderFile () {
        return new Promise(resolve => {
          stylus.render(stylusString, {}, (err, css) => {
            if (err) {
              throw err
            }

            resolve(css)
          })
        })
      }
    })

    it('should enable source maps in dev mode', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'development',
        css: {
          compiler: {
            enable: true,
            module: 'stylus'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()
      const buildOutput = fs.readFileSync(path.join(appDir, 'public/css/styles.map'), 'utf8')
      assert(buildOutput.includes('"mappings"'), 'build file is missing source map')
    })

    it('should enable source maps in prod mode with prodSourceMaps param', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'development',
        prodSourceMaps: true,
        css: {
          compiler: {
            enable: true,
            module: 'stylus'
          },
          minifier: {
            enable: false
          },
          output: 'css'
        }
      })

      await app.initServer()
      const buildOutput = fs.readFileSync(path.join(appDir, 'public/css/styles.map'), 'utf8')
      assert(buildOutput.includes('"mappings"'), 'build file is missing source map')
    })

    it('should write a version file when enabled', async () => {
      const app = roosevelt({
        ...appConfig,
        mode: 'development',
        css: {
          compiler: {
            enable: true,
            module: 'stylus'
          },
          minifier: {
            enable: false
          },
          output: 'css',
          versionFile: {
            fileName: '_version.styl',
            varName: 'appVersion'
          }
        }
      })

      await app.initServer()

      const buildOutput = fs.readFileSync(path.join(appDir, 'statics/css/_version.styl'), 'utf8')

      // check that a version file with the correct version code is generated
      assert(buildOutput.includes('appVersion = \'0.3.1\''), 'version file was not properly generated')
    })
  })
})
