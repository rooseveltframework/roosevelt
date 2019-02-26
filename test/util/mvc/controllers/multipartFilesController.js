module.exports = (router) => {
  const fse = require('fs-extra')
  const path = require('path')
  router.route('/multipartTest').post((req, res) => {
    let test = {}

    // see if the correct amount of files have been uploaded onto
    const keys = Object.keys(req.files)
    if (keys.length === 1) {
      test.lengthTest = true
    } else {
      test.lengthTest = false
    }

    // copy the files to another location located inside the app itself
    // copy file 1
    fse.copyFileSync(req.files[keys[0]].path, path.join(__dirname, '../../test1.txt'))

    // send back the test Object
    res.send(test)
  })

  router.route('/multipartUploadDir').post((req, res) => {
    let test = {}
    let keys = Object.keys(req.files)

    // see if the file exist in the upload dir
    if (req.files[keys[0]].path.includes(req.body.uploadDir)) {
      test.existsTest = true
    } else {
      test.existsTest = false
    }

    // send back the test Object
    res.send(test)
  })

  router.route('/multipartDelete').post((req, res) => {
    // make an object that can send back whether file exists or not
    let test = {
      existenceTest: []
    }
    // grab the keys of the files
    let keys = Object.keys(req.files)

    // going through each key, delete the file
    for (let x = 0; x < keys.length; x++) {
      fse.removeSync(req.files[keys[x]].path)
    }

    // check whether or not the files still exists
    for (let x = 0; x < keys.length; x++) {
      let fileTest = fse.existsSync(req.files[keys[x]].path)
      test.existenceTest.push(fileTest)
    }
    res.send(test)
  })

  router.route('/multipartChangePath').post((req, res) => {
    // make an object that can be sent back and looked on in mocha
    let test = {}
    let keys = Object.keys(req.files)
    // hold the original path
    test.originalPath = req.files[keys[0]].path
    // change it to something that's not a string
    req.files[keys[0]].path = 5
    // send back the object
    res.send(test)
  })

  router.route('/multipartDirSwitch').post((req, res) => {
    // object to pass back on response
    let test = {}
    // hold the path to the original temp file
    let keys = Object.keys(req.files)
    let path = req.files[keys[0]].path
    // delete the file and replace it with a directory, which should get an error on unlink
    fse.removeSync(path)
    fse.mkdirSync(path)
    test.path = path
    res.send(test)
  })

  router.route('/simpleMultipart').post((req, res) => {
    // object to send back to client
    let test = {}
    // save the amount of files onto the object and send it back
    let keys = Object.keys(req.files)
    test.count = keys.length
    res.send(test)
  })
}
