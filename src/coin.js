const RinkebyJSON = require('./contracts/MyRinkebyCoin.json')
const ExtdevJSON = require('./contracts/MyCoin.json')

const common = require('./common.js')

async function getRinkebyContract(web3js) {
  const networkId = await web3js.eth.net.getId()
  return new web3js.eth.Contract(
    RinkebyJSON.abi,
    RinkebyJSON.networks[networkId].address
  )
}

async function getRinkebyContractAddress(web3js) {
  const networkId = await web3js.eth.net.getId()
  return RinkebyJSON.networks[networkId].address
}

async function getRinkebyBalance(web3js, accountAddress) {
  const contract = await getRinkebyContract(web3js)
  const balance = await contract.methods
    .balanceOf(accountAddress)
    .call()
  return balance
}

async function depositToRinkebyGateway(web3js, amount, ownerAccount, gas) {
  const contract = await getRinkebyContract(web3js)
  const contractAddress = await getRinkebyContractAddress(web3js)
  const gateway = await common.getRinkebyGatewayContract(web3js)

  let gasEstimate = await contract.methods
    .approve(common.rinkebyGatewayAddress, amount.toString())
    .estimateGas({
      from: ownerAccount
    })

  if (gasEstimate == gas) {
    throw new Error('Not enough enough gas, send more.')
  }

  await contract.methods
    .approve(common.rinkebyGatewayAddress, amount.toString())
    .send({
      from: ownerAccount,
      gas: gasEstimate
    })

  gasEstimate = await gateway.methods
    .depositERC20(amount.toString(), contractAddress)
    .estimateGas({
      from: ownerAccount,
      gas
    })

  if (gasEstimate == gas) {
    throw new Error('Not enough enough gas, send more.')
  }

  return gateway.methods
    .depositERC20(amount.toString(), contractAddress)
    .send({
      from: ownerAccount,
      gas: gasEstimate
    })
}

async function getExtdevContract(web3js) {
  const networkId = await web3js.eth.net.getId()
  return new web3js.eth.Contract(
    ExtdevJSON.abi,
    ExtdevJSON.networks[networkId].address,
  )
}

async function getExtdevBalance(web3js, accountAddress) {
  const contract = await getExtdevContract(web3js)
  const addr = accountAddress.toLowerCase()
  const balance = await contract.methods
    .balanceOf(addr)
    .call({
      from: addr
    })
  return balance
}

// Returns a promise that will be resolved with a hex string containing the signature that must
// be submitted to the Ethereum Gateway to withdraw a token.
async function depositToExtdevGateway({
  client,
  web3js,
  amount,
  ownerExtdevAddress,
  ownerRinkebyAddress,
  tokenExtdevAddress,
  tokenRinkebyAddress,
  timeout
}) {
  const ownerExtdevAddr = common.Address.fromString(`${client.chainId}:${ownerExtdevAddress}`)
  const gatewayContract = await common.TransferGateway.createAsync(client, ownerExtdevAddr)

  const coinContract = await getExtdevContract(web3js)
  await coinContract.methods
    .approve(common.extdevGatewayAddress.toLowerCase(), amount.toString())
    .send({
      from: ownerExtdevAddress
    })

  const ownerRinkebyAddr = common.Address.fromString(`eth:${ownerRinkebyAddress}`)
  const receiveSignedWithdrawalEvent = new Promise((resolve, reject) => {
    let timer = setTimeout(
      () => reject(new Error('Timeout while waiting for withdrawal to be signed')),
      timeout
    )
    const listener = event => {
      const tokenEthAddr = common.Address.fromString(`eth:${tokenRinkebyAddress}`)
      if (
        event.tokenContract.toString() === tokenEthAddr.toString() &&
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

  const tokenExtdevAddr = common.Address.fromString(`${client.chainId}:${tokenExtdevAddress}`)
  await gatewayContract.withdrawERC20Async(amount, tokenExtdevAddr, ownerRinkebyAddr)
  console.log(`${amount.div(common.coinMultiplier).toString()} tokens deposited to DAppChain Gateway...`)

  const event = await receiveSignedWithdrawalEvent
  return common.CryptoUtils.bytesToHexAddr(event.sig)
}


async function withdrawFromRinkebyGateway({
  web3js,
  amount,
  accountAddress,
  signature,
  gas
}) {
  const gatewayContract = await common.getRinkebyGatewayContract(web3js)
  const networkId = await web3js.eth.net.getId()

  const gasEstimate = await gatewayContract.methods
    .withdrawERC20(amount.toString(), signature, RinkebyJSON.networks[networkId].address)
    .estimateGas({
      from: accountAddress,
      gas
    })

  if (gasEstimate == gas) {
    throw new Error('Not enough enough gas, send more.')
  }

  return gatewayContract.methods
    .withdrawERC20(amount.toString(), signature, RinkebyJSON.networks[networkId].address)
    .send({
      from: accountAddress,
      gas: gasEstimate
    })

}

module.exports = {
    RinkebyJSON: RinkebyJSON,
    ExtdevJSON: ExtdevJSON, 
    getRinkebyContract: getRinkebyContract,
    getRinkebyContractAddress: getRinkebyContractAddress,
    getRinkebyBalance: getRinkebyBalance,
    depositToRinkebyGateway: depositToRinkebyGateway,
    getExtdevContract: getExtdevContract,
    getExtdevBalance: getExtdevBalance,
    depositToExtdevGateway: depositToExtdevGateway,
    withdrawFromRinkebyGateway: withdrawFromRinkebyGateway,
}
