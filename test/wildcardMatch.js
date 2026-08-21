const { describe, it } = require('node:test')

const assert = require('assert')
const wildcardMatch = require('../lib/tools/wildcardMatch')

describe('wildcard matching', () => {
  describe('matching rules', () => {
    it('should match an exact string', () => {
      assert.strictEqual(wildcardMatch('/webhook', ['/webhook']), true)
    })

    it('should match a single wildcard within one path segment', () => {
      assert.strictEqual(wildcardMatch('/api/foo', ['/api/*']), true)
    })

    it('should not let a single wildcard cross a path separator', () => {
      assert.strictEqual(wildcardMatch('/api/foo/bar', ['/api/*']), false)
    })

    it('should match across path separators with a double wildcard', () => {
      assert.strictEqual(wildcardMatch('/api/foo/bar', ['/api/**']), true)
    })

    it('should match a file extension', () => {
      assert.strictEqual(wildcardMatch('index.html', ['*.html']), true)
    })

    it('should match any of a comma separated group', () => {
      assert.strictEqual(wildcardMatch('file.jsx', ['*.{js,jsx}']), true)
      assert.strictEqual(wildcardMatch('file.css', ['*.{js,jsx}']), false)
    })

    it('should return false when nothing in the list matches', () => {
      assert.strictEqual(wildcardMatch('/api/foo', ['/admin/*', '/static/*']), false)
    })

    it('should return true when any one rule in the list matches', () => {
      assert.strictEqual(wildcardMatch('/api/foo', ['/admin/*', '/api/*']), true)
    })

    it('should accept a single rule passed as a string rather than an array', () => {
      assert.strictEqual(wildcardMatch('/api/foo', '/api/*'), true)
    })

    it('should return false when the rule list is empty', () => {
      assert.strictEqual(wildcardMatch('/api/foo', []), false)
    })
  })

  // these matter because this function decides which routes skip CSRF checks, so a rule must never match more than it says
  describe('rules that must not match more than they say', () => {
    it('should not treat a leading exclamation point as matching everything else', () => {
      assert.strictEqual(wildcardMatch('/api/foo', ['!/api/bar']), false, 'a rule like this must not exempt every other route')
    })

    it('should not match a route that merely starts with the rule', () => {
      assert.strictEqual(wildcardMatch('/webhooks/evil', ['/webhook']), false)
    })

    it('should not match a route that merely contains the rule', () => {
      assert.strictEqual(wildcardMatch('/evil/webhook', ['/webhook']), false)
    })

    it('should not treat a backslash as a path separator', () => {
      assert.strictEqual(wildcardMatch('/api\\foo\\bar', ['/api/*']), false)
    })
  })
})
