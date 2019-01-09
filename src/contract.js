import {
  Client, LocalAddress, CryptoUtils, LoomProvider
} from 'loom-js'

import Web3 from 'web3'
import SimpleStore from './contracts/SimpleStore.json'

export default class Contract {
  async loadContract() {
    this.onEvent = null
    this._createClient()
    this._createCurrentUserAddress()
    this._createWebInstance()
    await this._createContractInstance()
  }

  _createClient() {
    this.privateKey = CryptoUtils.generatePrivateKey()
    this.publicKey = CryptoUtils.publicKeyFromPrivateKey(this.privateKey)
    let writeUrl = 'ws://127.0.0.1:46658/websocket'
    let readUrl = 'ws://127.0.0.1:46658/queryws'
    let networkId = 'default'

    if (process.env.NETWORK == 'extdev') {
      writeUrl = 'ws://extdev-plasma-us1.dappchains.com:80/websocket'
      readUrl = 'ws://extdev-plasma-us1.dappchains.com:80/queryws'
      networkId = 'extdev-plasma-us1'
    }

    this.client = new Client(networkId, writeUrl, readUrl)

    this.client.on('error', msg => {
      console.error('Error on connect to client', msg)
      console.warn('Please verify if loom command is running')
    })
  }

  _createCurrentUserAddress() {
    this.currentUserAddress = LocalAddress.fromPublicKey(this.publicKey).toString()
  }

  _createWebInstance() {
    this.web3 = new Web3(new LoomProvider(this.client, this.privateKey))
  }

  async _createContractInstance() {
    const networkId = await this._getCurrentNetwork()
    this.currentNetwork = SimpleStore.networks[networkId]

    if (!this.currentNetwork) {
      throw Error('Contract not deployed on DAppChain')
    }

    const ABI = SimpleStore.abi
    this.simpleStoreInstance = new this.web3.eth.Contract(ABI, this.currentNetwork.address, {
      from: this.currentUserAddress
    })

    this.simpleStoreInstance.events.NewValueSet({ filter: { _value: 10 }}, (err, event) => {
      if (err) console.error('Error on event', err)
      else {
        if (this.onEvent) {
          this.onEvent(event.returnValues)
        }
      }
    })

    this.simpleStoreInstance.events.NewValueSetAgain({ filter: { _value: 47 }}, (err, event) => {
      if (err) console.error('Error on event', err)
      else {
        setTimeout(() => alert("Loooomy help me :)"))
        if (this.onEvent) {
          this.onEvent(event.returnValues)
        }
      }
    })
  }

  addEventListener(fn) {
    this.onEvent = fn
  }

  async _getCurrentNetwork() {
    return Promise.resolve('default')
  }

  async setValue(value) {
    // Just a small test with Loomy
    if (value == 47) {
      return await this.simpleStoreInstance.methods.setAgain(value).send({
        from: this.currentUserAddress
      })
    }

    return await this.simpleStoreInstance.methods.set(value).send({
      from: this.currentUserAddress
    })
  }

  async getValue() {
    return await this.simpleStoreInstance.methods.get().call({
      from: this.currentUserAddress
    })
  }
}
