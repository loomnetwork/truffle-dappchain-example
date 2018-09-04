const { readFileSync } = require('fs')
const { join } = require('path')
const LoomTruffleProvider = require('loom-truffle-provider')

const chainId = 'default'
const writeUrl = 'http://127.0.0.1:46658/rpc'
const readUrl = 'http://127.0.0.1:46658/query'
const privateKey = readFileSync('./private_key', 'utf-8')

const loomTruffleProvider = new LoomTruffleProvider(chainId, writeUrl, readUrl, privateKey)
loomTruffleProvider.createExtraAccountsFromMnemonic("gravity top burden flip student usage spell purchase hundred improve check genre", 10)

module.exports = {
  contracts_build_directory: join(__dirname, './src/contracts'),
  networks: {
    loom_dapp_chain: {
      provider: loomTruffleProvider,
      network_id: '*'
    }
  }
}
