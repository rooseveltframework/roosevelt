const mocha = require('eslint-plugin-mocha')

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 'latest'
    },
    plugins: {
      mocha
    },
    rules: {
      'mocha/no-exclusive-tests': 'error'
    }
  }
]
