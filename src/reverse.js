const RinkebyJSON = require('./contracts/MyERC721XRinkebyToken.json')
const ExtdevJSON = require('./contracts/MyERC721XToken.json')

async function getExtdevContract(web3js) {
    const networkId = await web3js.eth.net.getId()
    console.log('networkId: ' + networkId)
    console.log('ExtdevJSON.networks[networkId].address:' + ExtdevJSON.networks[networkId].address)
    return new web3js.eth.Contract(
        ExtdevJSON.abi,
        ExtdevJSON.networks[networkId].address
    )
}

function loadExtdevAccount() {
  const privateKeyStr = fs.readFileSync(path.join(__dirname, '../extdev_private_key'), 'utf-8')
  const privateKey = CryptoUtils.B64ToUint8Array(privateKeyStr)
  const publicKey = CryptoUtils.publicKeyFromPrivateKey(privateKey)
  /*const client = new Client(
    extdevChainId,
    'http://127.0.0.1:46658/rpc',
    'http://127.0.0.1:46658/query'
  )*/

  const client = new Client(
  extdevChainId,
  'wss://extdev-plasma-us1.dappchains.com/websocket',
  'wss://extdev-plasma-us1.dappchains.com/queryws'
 )

  client.txMiddleware = [
    new NonceTxMiddleware(publicKey, client),
    new SignedTxMiddleware(privateKey)
  ]

  client.on('error', msg => {
    console.error('PlasmaChain connection error', msg)
  })
}

async function mintFT(web3js, tokenId, amount, ownerAccount) {
    const contract = await getExtdevContract(web3js)
    const addr = ownerAccount.toLowerCase()
    return contract.methods
      .mint(tokenId, addr, amount)
      .send({
        from: addr
      })
  }

  async function depositFTToGateway(web3js, tokenId, amount, ownerAccount) {
    const contract = await getExtdevContract(web3js)
    return contract.methods
      .depositToGatewayFT(tokenId, amount)
      .send({
        from: ownerAccount,
      })
  }

module.exports = {
    mintFT: mintFT,
    depositFTToGateway: depositFTToGateway,
}
