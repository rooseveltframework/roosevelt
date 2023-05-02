SOURCES = *.js
TESTS = test/*.test.js test/**/*.test.js

lint: lint-jshint
test: test-mocha
test-cov: test-istanbul-mocha
view-cov: view-istanbul-report


# ==============================================================================
# Node.js
# ==============================================================================
include ./lib/support/mk/node.mk
include ./lib/support/mk/mocha.mk

# ==============================================================================
# Browserify
# ==============================================================================
BROWSERIFY_MAIN = ./lib/parent-require.js

include ./lib/support/mk/browserify.mk
include ./lib/support/mk/testling.mk

# ==============================================================================
# Code Quality
# ==============================================================================
include ./lib/support/mk/notes.mk
include ./lib/support/mk/jshint.mk
include ./lib/support/mk/istanbul.mk

# ==============================================================================
# Continuous Integration
# ==============================================================================
include support/mk/coveralls.mk

ci-travis: test test-cov
submit-coverage-to-coveralls: submit-istanbul-lcov-to-coveralls

# ==============================================================================
# Clean
# ==============================================================================
clean:
	rm -rf build
	rm -rf reports

clobber: clean clobber-node


.PHONY: lint test test-cov view-cov ci-travis clean clobber
