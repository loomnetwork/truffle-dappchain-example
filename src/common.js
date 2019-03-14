const fs = require('fs')
const path = require('path')
const Web3 = require('web3')

const RinkebyGatewayJSON = require('./Gateway.json')

// See https://loomx.io/developers/docs/en/testnet-plasma.html#contract-addresses-transfer-gateway
// for the most up to date address.
const rinkebyGatewayAddress = '0xb73C9506cb7f4139A4D6Ac81DF1e5b6756Fab7A2'
const extdevGatewayAddress = '0xE754d9518bF4a9C63476891eF9Aa7D91c8236a5d'
//const extdevChainId = 'default'
const extdevChainId = 'extdev-plasma-us1'
const {
    Client,
    Address,
    CryptoUtils,
    Contracts,
    NonceTxMiddleware,
    SignedTxMiddleware,
    LocalAddress,
    LoomProvider,
    Contract,
    Web3Signer,
    soliditySha3
} = require('loom-js')
const TransferGateway = Contracts.TransferGateway
const AddressMapper = Contracts.AddressMapper
const BN = require('bn.js')
const coinMultiplier = new BN(10).pow(new BN(18))

async function getRinkebyGatewayContract(web3js) {
    const networkId = await web3js.eth.net.getId()
    return new web3js.eth.Contract(
        RinkebyGatewayJSON.abi,
        RinkebyGatewayJSON.networks[networkId].address
    )
}


function loadRinkebyAccount() {
  const privateKey = fs.readFileSync(path.join(__dirname, '../rinkeby_private_key'), 'utf-8')
  const web3js = new Web3(`https://rinkeby.infura.io/${process.env.INFURA_API_KEY}`)

  const ownerAccount = web3js.eth.accounts.privateKeyToAccount('0x' + privateKey)
  web3js.eth.accounts.wallet.add(ownerAccount)
  return {
    account: ownerAccount,
    web3js
  }
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

  return {
    account: LocalAddress.fromPublicKey(publicKey).toString(),
    web3js: new Web3(new LoomProvider(client, privateKey)),
    client
  }
}

async function mapContracts({
  client,
  signer,
  tokenRinkebyAddress,
  tokenExtdevAddress,
  ownerExtdevAddress,
  rinkebyTxHash
}) {
  const ownerExtdevAddr = Address.fromString(`${client.chainId}:${ownerExtdevAddress}`)
  const gatewayContract = await TransferGateway.createAsync(client, ownerExtdevAddr)
  const foreignContract = Address.fromString(`eth:${tokenRinkebyAddress}`)
  const localContract = Address.fromString(`${client.chainId}:${tokenExtdevAddress}`)

  const hash = soliditySha3({
    type: 'address',
    value: tokenRinkebyAddress.slice(2)
  }, {
    type: 'address',
    value: tokenExtdevAddress.slice(2)
  })

  const foreignContractCreatorSig = await signer.signAsync(hash)
  const foreignContractCreatorTxHash = Buffer.from(rinkebyTxHash.slice(2), 'hex')

  await gatewayContract.addContractMappingAsync({
    localContract,
    foreignContract,
    foreignContractCreatorSig,
    foreignContractCreatorTxHash
  })
}

async function mapAccounts({
  client,
  signer,
  ownerRinkebyAddress,
  ownerExtdevAddress
}) {
  const ownerRinkebyAddr = Address.fromString(`eth:${ownerRinkebyAddress}`)
  const ownerExtdevAddr = Address.fromString(`${client.chainId}:${ownerExtdevAddress}`)
  const mapperContract = await AddressMapper.createAsync(client, ownerExtdevAddr)

  try {
    const mapping = await mapperContract.getMappingAsync(ownerExtdevAddr)
    console.log(`${mapping.from.toString()} is already mapped to ${mapping.to.toString()}`)
    return
  } catch (err) {
    // assume this means there is no mapping yet, need to fix loom-js not to throw in this case
  }
  console.log(`mapping ${ownerRinkebyAddr.toString()} to ${ownerExtdevAddr.toString()}`)
  await mapperContract.addIdentityMappingAsync(ownerExtdevAddr, ownerRinkebyAddr, signer)
  console.log(`Mapped ${ownerExtdevAddr} to ${ownerRinkebyAddr}`)
}

async function getPendingWithdrawalReceipt(client, ownerAddress) {
  const ownerAddr = Address.fromString(`${client.chainId}:${ownerAddress}`)
  const gatewayContract = await TransferGateway.createAsync(client, ownerAddr)
  return gatewayContract.withdrawalReceiptAsync(ownerAddr)
}

module.exports = {
    Address: Address,
    coinMultiplier: coinMultiplier,
    rinkebyGatewayAddress: rinkebyGatewayAddress,
    extdevGatewayAddress: extdevGatewayAddress,
    TransferGateway: TransferGateway,
    getRinkebyGatewayContract: getRinkebyGatewayContract,
    loadRinkebyAccount: loadRinkebyAccount,
    loadExtdevAccount: loadExtdevAccount,
    mapContracts: mapContracts,
    mapAccounts: mapAccounts,
    getPendingWithdrawalReceipt: getPendingWithdrawalReceipt,
    CryptoUtils: CryptoUtils,
}
