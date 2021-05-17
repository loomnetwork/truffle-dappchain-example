const { readFileSync } = require('fs')
const path = require('path')
const { join } = require('path')
const LoomTruffleProvider = require('loom-truffle-provider')
const HDWalletProvider = require('truffle-hdwallet-provider')
const { sha256 } = require('js-sha256')
const { CryptoUtils } = require('loom-js')
const { mnemonicToSeedSync } = require('bip39')
const fs = require('fs')
const PrivateKeyProvider = require("truffle-privatekey-provider");
const EXPECTING_FILE_ERROR = "Expecting either a private key or a mnemonic file. Refer to the README file for more details."


function getLoomProviderWithPrivateKey(privateKeyPath, chainId, writeUrl, readUrl) {
  const privateKey = readFileSync(privateKeyPath, 'utf-8')
  return new LoomTruffleProvider(chainId, writeUrl, readUrl, privateKey)
}

function getLoomProviderWithMnemonic(mnemonicPath, chainId, writeUrl, readUrl) {
  const mnemonic = readFileSync(mnemonicPath, 'utf-8').toString().trim()
  const seed = mnemonicToSeedSync(mnemonic)
  const privateKeyUint8ArrayFromSeed = CryptoUtils.generatePrivateKeyFromSeed(new Uint8Array(sha256.array(seed)))
  const privateKeyB64 = CryptoUtils.Uint8ArrayToB64(privateKeyUint8ArrayFromSeed)
  return new LoomTruffleProvider(chainId, writeUrl, readUrl, privateKeyB64)
}

module.exports = {
  contracts_build_directory: join(__dirname, './src/contracts'),
  compilers: {
    solc: {
      version: '0.8.0'
    }
  },
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    loom_dapp_chain: {
      provider: function () {
        const chainId = 'default'
        const writeUrl = 'http://127.0.0.1:46658/rpc'
        const readUrl = 'http://127.0.0.1:46658/query'
        const mnemonicPath = path.join(__dirname, 'loom_mnemonic')
        const privateKeyPath = path.join(__dirname, 'loom_private_key')
        if (fs.existsSync(privateKeyPath)) {
          const loomTruffleProvider = getLoomProviderWithPrivateKey(privateKeyPath, chainId, writeUrl, readUrl)
          loomTruffleProvider.createExtraAccountsFromMnemonic("gravity top burden flip student usage spell purchase hundred improve check genre", 10)
          return loomTruffleProvider
        } else if (fs.existsSync(mnemonicPath)) {
          const loomTruffleProvider = getLoomProviderWithMnemonic(mnemonicPath, chainId, writeUrl, readUrl)
          return loomTruffleProvider
        } else {
          throw new Error(EXPECTING_FILE_ERROR)
        }
      },
      network_id: '*',
      port: 8545
    },
    loomv2b: {
      provider: function () {
        const chainId = 'loomv2b'
        const writeUrl = 'http://loomv2b.dappchains.com:46658/rpc'
        const readUrl = 'http://loomv2b.dappchains.com:46658/query'
        const mnemonicPath = path.join(__dirname, 'loomv2b_mnemonic')
        const privateKeyPath = path.join(__dirname, 'loomv2b_pk')
        if (fs.existsSync(privateKeyPath)) {
          const loomTruffleProvider = getLoomProviderWithPrivateKey(privateKeyPath, chainId, writeUrl, readUrl)
          return loomTruffleProvider
        } else if (fs.existsSync(mnemonicPath)) {
          const loomTruffleProvider = getLoomProviderWithMnemonic(mnemonicPath, chainId, writeUrl, readUrl)
          return loomTruffleProvider
        } else {
          throw new Error(EXPECTING_FILE_ERROR)
        }
      },
      network_id: '12106039541279'
    },
    extdev_plasma_us1: {
      provider: function () {
        const chainId = 'extdev-plasma-us1'
        const writeUrl = 'http://extdev-plasma-us1.dappchains.com:80/rpc'
        const readUrl = 'http://extdev-plasma-us1.dappchains.com:80/query'
        const mnemonicPath = path.join(__dirname, 'extdev_mnemonic')
        const privateKeyPath = path.join(__dirname, 'extdev_private_key')
        if (fs.existsSync(privateKeyPath)) {
          const loomTruffleProvider = getLoomProviderWithPrivateKey(privateKeyPath, chainId, writeUrl, readUrl)
          // use a dummy mnemonic to create a bunch of accounts we'll use for testing purposes
          loomTruffleProvider.createExtraAccountsFromMnemonic("gravity top burden flip student usage spell purchase hundred improve check genre", 10)
          
          return loomTruffleProvider
        } else if (fs.existsSync(mnemonicPath)) {
          const loomTruffleProvider = getLoomProviderWithMnemonic(mnemonicPath, chainId, writeUrl, readUrl)
          return loomTruffleProvider
        } else {
          throw new Error(EXPECTING_FILE_ERROR)
        }
      },
      network_id: '9545242630824'
    },
    loom_mainnet: {
      provider: function () {
        const chainId = 'default'
        const writeUrl = 'http://plasma.dappchains.com/rpc'
        const readUrl = 'http://plasma.dappchains.com/query'
        const mnemonicPath = path.join(__dirname, 'mainnet_mnemonic')
        const privateKeyPath = path.join(__dirname, 'mainnet_private_key')
        if (fs.existsSync(privateKeyPath)) {
          const loomTruffleProvider = getLoomProviderWithPrivateKey(privateKeyPath, chainId, writeUrl, readUrl)
          return loomTruffleProvider
        } else if (fs.existsSync(mnemonicPath)) {
          const loomTruffleProvider = getLoomProviderWithMnemonic(mnemonicPath, chainId, writeUrl, readUrl)
          return loomTruffleProvider
        } else {
          throw new Error(EXPECTING_FILE_ERROR)
        }
      },
      network_id: '*'
    },
    rinkeby: {
      provider: function () {
        if (!process.env.INFURA_API_KEY) {
          throw new Error("INFURA_API_KEY env var not set")
        }
        const mnemonicPath = path.join(__dirname, 'rinkeby_mnemonic')
        const privateKeyPath = path.join(__dirname, 'rinkeby_private_key')
        if (fs.existsSync(privateKeyPath)) {
          const privateKey = readFileSync(path.join(__dirname, 'rinkeby_private_key'), 'utf-8')
          return new PrivateKeyProvider(privateKey, `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`, 0, 10)
        } else if (fs.existsSync(mnemonicPath)) {
          const mnemonic = readFileSync(path.join(__dirname, 'rinkeby_mnemonic'), 'utf-8')
          return new HDWalletProvider(mnemonic, `https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`, 0, 10)
        } else {
          throw new Error(EXPECTING_FILE_ERROR)
        }
      },
      network_id: 4,
      gasPrice: 15000000001,
      skipDryRun: true
    }
  }
}
