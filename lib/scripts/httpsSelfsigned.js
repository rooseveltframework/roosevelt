module.exports = function (appDir) {
  const selfsigned = require('selfsigned')
  const pems = selfsigned.generate(null, {
    keySize: 2048, // the size for the private key in bits (default: 1024)
    days: 3652500, // how long till expiry of the signed certificate (default: 10,000)
    algorithm: 'sha256', // sign the certificate with specified algorithm (default: 'sha1')
    extensions: [{ name: 'basicConstraints', cA: true }], // certificate extensions array
    pkcs7: true, // include PKCS#7 as part of the output (default: false)
    clientCertificate: true, // generate client cert signed by the original key (default: false)
    clientCertificateCN: 'unkown' // client certificate's common name (default: 'John Doe jdoe123')
  });
    
  const fs = require('fs')
  const key = pems.private
  const cert = pems.cert
  const keyFolder = './certs';

  try {
    if (!fs.existsSync(keyFolder)){
        fs.mkdirSync(keyFolder);
    }  
    fs.writeFile('./certs/key.pems', key, err => {
        if (err) {
          console.error(err)
          return
        }
        //file written successfully
      })
      
      fs.writeFile('./certs/cert.pems', cert, err => {
        if (err) {
          console.error(err)
          return
        }
        //file written successfully
    })
  } catch {}
}
  