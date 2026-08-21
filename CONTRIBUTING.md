# How to contribute

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
    - Each sync also links the commands Roosevelt ships into your test app's `node_modules/.bin`, so `npx roosevelt-migrate-config` and the rest work there. npm only makes those links when it installs a package, and dev sync copies files without running an install, so without this they would be missing and `npx` would go looking on the npm registry instead.
  - To stop the script:

      - Press: `control^ + C`.
      - Type: `stop` or `s`.

### Running the tests

`npm t`

To step through a test in a debugger, use `npm run test-debug`, which runs the files one at a time and waits for you to attach.

#### Troubleshooting the automated tests

If some of the automated tests fail for you when they shouldn't be, remove the `test/app` folder and run the suite again. Each test file builds its app in a folder of its own under there, and a run that was interrupted partway can leave one behind in a state the next run does not expect.

Tests keep the apps they start quiet by switching off logging in the Roosevelt config they build, along these lines:

```javascript
logging: { methods: { http: false, info: false, warn: false } }
```

If you want to see what an app in a test is printing, take out the methods you want to watch. To assert on that output rather than read it, use `test/util/captureLogs.js`, which collects everything logged during a test and hands it back as a string.

## Before opening a pull request

- Be sure all tests pass: `npm t`.
- Be sure the linter passes: `npm run lint`. Most of what it finds can be fixed for you with `npm run lint-fix`.
- Ensure good test coverage and write new tests if necessary: `npm run coverage`.
- Add your changes to `CHANGELOG.md`.

Continuous integration runs the suite against every combination Roosevelt claims to support: Node 22, 24, and 26, on Linux, Mac, and Windows, against both Express 4 and Express 5. Express is a peer dependency, so a change that touches how Roosevelt talks to Express needs to work on both majors. To check the one you are not currently developing against:

```
npm install express@4 --no-save
```

Run `npm i` afterwards to put your usual version back.

## Release process

If you are a maintainer, please follow the following release procedure:

- Merge all desired pull requests into main.
- Bump `package.json` to a new version and run `npm i` to generate a new `package-lock.json`.
- Add new version to CHANGELOG.
- Paste contents of CHANGELOG into new version commit.
- Open and merge a pull request with those changes.
- Tag the merge commit as the a new release version number.
- Smoke test the package as npm will actually publish it: `npm run test-package`.
  - This packs Roosevelt, installs it into a throwaway app, and checks that the published files are complete, that the Express peer dependency behaves on both supported Express majors, that the `npx roosevelt-*` commands are installed and run, and that a config file written against `roosevelt/config` loads. It runs in CI too.
  - It is separate from `npm t` because it hits the network and takes about a minute. It also catches what the test suite structurally cannot: the suite runs against this repo, where everything is already installed, so it can never notice a file missing from the package or a peer dependency the app has to supply itself.

- Publish commit to npm.
- Publish new generator-roosevelt and mkroosevelt versions as well.
- Submit a pull request to the Roosevelt website [following the instructions here](https://github.com/rooseveltframework/roosevelt-website/blob/main/CONTRIBUTING.md).
