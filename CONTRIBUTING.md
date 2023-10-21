# How to contribute to Roosevelt

## Manual testing

- Create a Roosevelt sample app using `generator-roosevelt` or `mkroosevelt`.
- Link your sample app's dependency to your local clone of Roosevelt in your sample app's package.json dependency list.

## Before opening a pull request

- Be sure all tests pass: `npm t`.
- Ensure 100% code coverage and write new tests if necessary: `npm run coverage`.
- Add your changes to `CHANGELOG.md`.
- If the changes are breaking, add a new documentation history entry to the bottom of the README.

## Release process

If you are a maintainer of Roosevelt, please follow the following release procedure:

- Merge all desired pull requests into master.
- Bump `package.json` to a new version and run `npm i` to generate a new `package-lock.json`.
- Alter CHANGELOG "Next version" section and stamp it with the new version.
- Paste contents of CHANGELOG into new version commit.
- Open and merge a pull request with those changes.
- Tag the merge commit as the a new release version number.
- Publish commit to npm.
- Publish new generator-roosevelt and mkroosevelt versions as well.
