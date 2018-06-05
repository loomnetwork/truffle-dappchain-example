const { readFileSync } = require('fs')
const LoomTruffleProvider = require('loom-truffle-provider')

const chainId    = 'default'
const writeUrl   = 'ws://127.0.0.1:46657/websocket'
const readUrl    = 'ws://127.0.0.1:9999/queryws'
const privateKey = readFileSync('./private_key', 'utf-8')

const loomTruffleProvider = new LoomTruffleProvider(chainId, writeUrl, readUrl, privateKey)

module.exports = {
  networks: {
    loom_dapp_chain: {
      provider: function() {
        return loomTruffleProvider
      }, network_id: '*'
    },
    development: {
      host: 'localhost',
      port: '8545',
      network_id: '*'
    },
  }
}
