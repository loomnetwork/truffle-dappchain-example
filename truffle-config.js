const { readFileSync } = require('fs')
const { join } = require('path')
const LoomTruffleProvider = require('loom-truffle-provider')

const privateKey = readFileSync('./private_key', 'utf-8')
let extdevPrivateKey

try {
  extdevPrivateKey = readFileSync('./extdev_private_key', 'utf-8')
} catch (error) {}

module.exports = {
  contracts_build_directory: join(__dirname, './src/contracts'),
  networks: {
    loom_dapp_chain: {
      provider: function() {
        const chainId = 'default'
        const writeUrl = 'http://127.0.0.1:46658/rpc'
        const readUrl = 'http://127.0.0.1:46658/query'
        const loomTruffleProvider = new LoomTruffleProvider(chainId, writeUrl, readUrl, privateKey)
        loomTruffleProvider.createExtraAccountsFromMnemonic("gravity top burden flip student usage spell purchase hundred improve check genre", 10)
        return loomTruffleProvider
      },
      network_id: '*'
    },
    extdev_plasma_us1: {
      provider: function() {
        if (!extdevPrivateKey) {
          throw new Error('extdev_private_key not found')
        }
        const chainId = 'extdev-plasma-us1'
        const writeUrl = 'http://extdev-plasma-us1.dappchains.com:80/rpc'
        const readUrl = 'http://extdev-plasma-us1.dappchains.com:80/query'
        return new LoomTruffleProvider(chainId, writeUrl, readUrl, extdevPrivateKey)
      },
      network_id: 'extdev-plasma-us1'
    }
  }
}
