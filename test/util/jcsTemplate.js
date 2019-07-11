module.exports = (filepath, options, callback) => {
  const fse = require('fs-extra')
  fse.readFile(filepath, (err, content) => {
    if (err) {
      return callback(err)
    }
    const rendered = content.toString().replace('$/header/$', '<header>' + options.header + '</header>')
      .replace('$/paragraph/$', '<p>' + options.paragraph + '</p>')
    return callback(null, rendered)
  })
}
