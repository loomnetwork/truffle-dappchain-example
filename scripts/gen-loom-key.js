const { CryptoUtils } = require('loom-js')
const fs = require('fs')

if (process.argv.length <= 2) {
	console.log("Usage: " + __filename + " <filename>.")
	process.exit(1);
}

const privateKey = CryptoUtils.generatePrivateKey()
const privateKeyString = CryptoUtils.Uint8ArrayToB64(privateKey)

let path = process.argv[2]
fs.writeFileSync(path, privateKeyString)