// This script generates a new BIP39 mnemonic and writes it out to a file in the parent directory,
// it also generates the a key from the mnemonic and writes that out to a file in the parent
// directory. The script expects 1-2 arguments, the first must specify the prefix to use for the
// generated files, the second argument may be used to specify the mnemonic to use instead of
// generating a new one.

const fs = require('fs')
const path = require('path')
const bip39 = require('bip39')
const hdkey = require('ethereumjs-wallet/hdkey')

const prefix = process.argv[2]

if (!prefix) {
    throw new Error('prefix not specified')
}

let mnemonic = process.argv[3]

if (mnemonic) {
    console.log('using mnemonic: ' + mnemonic)
} else {
    mnemonic = bip39.generateMnemonic()
}

const hdwallet = hdkey.fromMasterSeed(bip39.mnemonicToSeed(mnemonic))
const wallet_hdpath = "m/44'/60'/0'/0/"

const wallet = hdwallet.derivePath(wallet_hdpath + '0').getWallet()

fs.writeFileSync(path.join(__dirname, `../${prefix}_account`), '0x' + wallet.getAddress().toString('hex'))
fs.writeFileSync(path.join(__dirname, `../${prefix}_mnemonic`), mnemonic)
fs.writeFileSync(path.join(__dirname, `../${prefix}_private_key`), wallet.getPrivateKey().toString('hex'))