# How to contribute to Roosevelt

## Coding

Here's how to set up a development environment to hack on Roosevelt's code:

- Fork/clone this repo.

- Create or find a Roosevelt app you want to test against.
  - To make a Roosevelt app, run `npx mkroosevelt`.

- Use the `devSync.js` tool to test your fork/clone of Roosevelt against your test app.

  - To do that:

    - Run the following command:
      - Linux/Mac: `node devSync.js /path/to/roosevelt/app`.
      - Windows: `node devSync.js path:\\to\\roosevelt\\app`.

      - You can also set the path in a `ROOSEVELT_DEST_DIR` environment variable. When set, you only need to run `node devSync.js`.
        - Linux/Mac: `export ROOSEVELT_DEST_DIR=/path/to/roosevelt/app`.
        - Windows: `$env:ROOSEVELT_DEST_DIR="path:\\to\\roosevelt\\app"`.
        - Or in one command (Linux/Mac): `export ROOSEVELT_DEST_DIR=/path/to/your/roosevelt/app && node devSync.js`.

    - If you do not provide a path, running the `devSync.js` script will prompt you for one.
  - To stop the script:

      - Press: `control^ + C`.
      - Type: `stop` or `s`.

### Troubleshooting the automated tests

If some of the automated tests fail for you when they shouldn't be, make sure you remove the `test/app` folder and kill any Node.js processes (e.g. `killall node`) before running the test suite again.

If you want to see the output from a generated test app in one of the tests, insert this block of code into the test:

```javascript
testApp.stdout.on('data', (data) => {
  console.log(data.toString())
})
```

## Before opening a pull request

- Be sure all tests pass: `npm t`.
- Ensure adequate code coverage and write new tests if necessary: `npm run coverage`.
- Add your changes to `CHANGELOG.md`.
- If the changes are breaking, add a new documentation history entry to the bottom of the README.

## Release process

If you are a maintainer of Roosevelt, please follow the following release procedure:

- Merge all desired pull requests into main.
- Bump `package.json` to a new version and run `npm i` to generate a new `package-lock.json`.
- If releasing a new major version, update the link to the previous versions of the documentation.
- Alter CHANGELOG "Next version" section and stamp it with the new version.
- Paste contents of CHANGELOG into new version commit.
- Open and merge a pull request with those changes.
- Tag the merge commit as the a new release version number.
- Publish commit to npm.
- Publish new generator-roosevelt and mkroosevelt versions as well.
