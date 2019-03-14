const {
    Address,
    CryptoUtils,
    Contracts,
} = require('loom-js')
const BN = require('bn.js')
const common = require('./common.js')
const Tx = require('ethereumjs-tx')
const EthCoin = Contracts.EthCoin

async function getRinkebyBalance(web3js, accountAddress) {
  const balance = await web3js.eth.getBalance(accountAddress);
  return balance
}

async function depositToRinkebyGateway(web3js, amount, unit, ownerAccount) {
  // the address that will send the test transaction
  const addressFrom = ownerAccount.address
  const privKey = ownerAccount.privateKey.slice(2)

  // the destination address
  const addressTo = common.rinkebyGatewayAddress

  // Signs the given transaction data and sends it. Abstracts some of the details
  // of buffering and serializing the transaction for web3.
  async function sendSigned(txData, cb) {
    const privateKey = new Buffer(privKey, 'hex')
    const transaction = new Tx(txData)
    transaction.sign(privateKey)
    const serializedTx = transaction.serialize().toString('hex')
    return await web3js.eth.sendSignedTransaction('0x' + serializedTx, cb)
  }

  // get the number of transactions sent so far so we can create a fresh nonce
  const txCount = await web3js.eth.getTransactionCount(addressFrom)

  const nonce = web3js.utils.toHex(txCount);
  const gasLimit = web3js.utils.toHex(25000)
  const gasPrice = web3js.utils.toHex(10e9)
  const value = web3js.utils.toHex(web3js.utils.toWei(amount, unit))

  // construct the transaction data
  const txData = {
    nonce,
    gasLimit,
    gasPrice, // 10 Gwei
    to: addressTo,
    from: addressFrom,
    value
  }

  // fire away!
  return sendSigned(txData, function (err, result) {
    if (err) return console.log('error', err)
    console.log('sent', result)
  })

}

async function getExtdevBalance(client, accountAddress) {
  const addr = common.Address.fromString(`${client.chainId}:${accountAddress}`)
  const ethCoin = await EthCoin.createAsync(client, addr);
  const balance = await ethCoin.getBalanceOfAsync(addr);
  return balance.toString();
}

async function withdrawFromRinkebyGateway({
  web3js,
  amount,
  accountAddress,
  signature,
  gas
}) {
  const gatewayContract = await common.getRinkebyGatewayContract(web3js)

  const gasEstimate = await gatewayContract.methods
    .withdrawETH(amount.toString(), signature)
    .estimateGas({
      from: accountAddress,
      gas
    })

  if (gasEstimate == gas) {
    throw new Error('Not enough enough gas, send more.')
  }

  return gatewayContract.methods
    .withdrawETH(amount.toString(), signature)
    .send({
      from: accountAddress,
      gas: gasEstimate
    })

}


// Returns a promise that will be resolved with a hex string containing the signature that must
// be submitted to the Ethereum Gateway to withdraw a eth.
async function depositToExtdevGateway({
  client, amount,
  ownerExtdevAddress, ownerRinkebyAddress,
  timeout
}) {
  const ownerExtdevAddr = common.Address.fromString(`${client.chainId}:${ownerExtdevAddress}`)
  const gatewayContract = await common.TransferGateway.createAsync(client, ownerExtdevAddr)

  const ethCoin = await EthCoin.createAsync(client, ownerExtdevAddr);
  const extdevGatewayAddr = common.Address.fromString(`${client.chainId}:${common.extdevGatewayAddress}`)
  await ethCoin.approveAsync(extdevGatewayAddr, new BN(amount))
  
  const ownerRinkebyAddr = common.Address.fromString(`eth:${ownerRinkebyAddress}`)
  const rinkebyGatewayAddr = common.Address.fromString(`eth:${common.rinkebyGatewayAddress}`)

  const receiveSignedWithdrawalEvent = new Promise((resolve, reject) => {
    let timer = setTimeout(
      () => reject(new Error('Timeout while waiting for withdrawal to be signed')),
      timeout
    )
    const listener = event => {
      if (
        event.tokenContract.toString() === rinkebyGatewayAddr.toString() &&
        event.tokenOwner.toString() === ownerRinkebyAddr.toString()
      ) {
        clearTimeout(timer)
        timer = null
        gatewayContract.removeAllListeners(common.TransferGateway.EVENT_TOKEN_WITHDRAWAL)
        resolve(event)
      }
    }
    gatewayContract.on(common.TransferGateway.EVENT_TOKEN_WITHDRAWAL, listener)
  })

  await gatewayContract.withdrawETHAsync(new BN(amount), rinkebyGatewayAddr, ownerRinkebyAddr)
  console.log(`${amount.toString()} wei deposited to DAppChain Gateway...`)

  const event = await receiveSignedWithdrawalEvent
  return common.CryptoUtils.bytesToHexAddr(event.sig)
}

module.exports = {
    getRinkebyBalance: getRinkebyBalance,
    depositToRinkebyGateway: depositToRinkebyGateway,
    getExtdevBalance: getExtdevBalance,
    withdrawFromRinkebyGateway: withdrawFromRinkebyGateway,
    depositToExtdevGateway: depositToExtdevGateway,
}
