// base url for links to the roosevelt docs
// it names the version that is actually running rather than "latest", so that a link printed by an older app still points at the docs describing that app
const { version } = require('../../package.json')

module.exports = `https://rooseveltframework.org/docs/${version}`
