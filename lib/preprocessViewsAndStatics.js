require('@colors/colors')
const fs = require('fs-extra')
const path = require('path')

module.exports = async app => {
  const fsr = require('./tools/fsr')(app)
  const params = app.get('params')

  // preprocesses html, css, and js files
  if (params.makeBuildArtifacts) {
    if (app.get('preprocessedViewsPath')) fsr.ensureDirSync(app.get('preprocessedViewsPath'))
    if (app.get('preprocessedStaticsPath') && (params?.minifyHtmlAttributes?.enable === 'development' || (params?.minifyHtmlAttributes?.enable && process.env.NODE_ENV === 'production'))) {
      fsr.ensureDirSync(app.get('preprocessedStaticsPath'))
      fsr.ensureDirSync(params.css.sourcePath)
      fsr.ensureDirSync(params.js.sourcePath)
    }

    // progressively enhance web components
    if (app.get('preprocessedViewsPath') && fs.existsSync(app.get('viewsPath')) && fs.existsSync(app.get('preprocessedViewsPath'))) {
      const editedFiles = require('progressively-enhance-web-components')({
        templatesDir: app.get('viewsPath')
      })

      // copy unmodified templates to a modified templates directory
      fs.copySync(app.get('viewsPath'), app.get('preprocessedViewsPath'))

      // update the relevant templates
      for (const file in editedFiles) {
        fs.writeFileSync(file.replace(app.get('viewsPath'), app.get('preprocessedViewsPath')), editedFiles[file])
      }
    }

    // minify html attributes
    if ((params?.minifyHtmlAttributes?.enable === 'development' || (params?.minifyHtmlAttributes?.enable && process.env.NODE_ENV === 'production')) && app.get('preprocessedViewsPath') && fs.existsSync(app.get('viewsPath')) && fs.existsSync(app.get('preprocessedViewsPath')) && app.get('preprocessedStaticsPath') && fs.existsSync(app.get('preprocessedStaticsPath'))) {
      if (!params.minifyHtmlAttributes) params.minifyHtmlAttributes = {}
      if (!params.minifyHtmlAttributes.minifyHtmlAttributesParams) params.minifyHtmlAttributes.minifyHtmlAttributesParams = {}

      // copy all source html, css, and js to locations that are safe for editing
      fs.copySync(app.get('viewsPath'), app.get('preprocessedViewsPath'))
      fs.copySync(path.join(app.get('staticsRoot'), params.css.sourcePath.replace(app.get('preprocessedStaticsPath'), '')), params.css.sourcePath)
      fs.copySync(path.join(app.get('staticsRoot'), params.js.sourcePath.replace(app.get('preprocessedStaticsPath'), '')), params.js.sourcePath)

      // take user-supplied options for minify-html-attributes
      const htmlMinifyAttributesOptions = {
        ...params.minifyHtmlAttributes.minifyHtmlAttributesParams
      }

      // but reset their directories to match roosevelt dirs
      htmlMinifyAttributesOptions.htmlDir = app.get('preprocessedViewsPath')
      htmlMinifyAttributesOptions.cssDir = app.get('preprocessedStaticsPath')
      htmlMinifyAttributesOptions.jsDir = app.get('preprocessedStaticsPath')

      // load minify-html-attributes
      const editedFiles = require('minify-html-attributes')(htmlMinifyAttributesOptions)

      // update any file that was postprocessed
      for (const fileName in editedFiles) {
        const editedFile = editedFiles[fileName]
        fs.writeFileSync(fileName, editedFile.contents)
      }
    }
  }
}
