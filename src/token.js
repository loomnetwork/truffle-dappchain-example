const RinkebyJSON = require('./contracts/MyRinkebyToken.json')
const ExtdevJSON = require('./contracts/MyToken.json')
const BN = require('bn.js')
const common = require('./common.js')

async function getRinkebyContract(web3js) {
  const networkId = await web3js.eth.net.getId()
  return new web3js.eth.Contract(
    RinkebyJSON.abi,
    RinkebyJSON.networks[networkId].address
  )
}


// Returns an object containing the total number of tokens owned by the given account,
// and up to 5 token IDs.
async function getRinkebyBalance(web3js, accountAddress) {
  const contract = await getRinkebyContract(web3js)
  const total = await contract.methods
    .balanceOf(accountAddress)
    .call()
  const tokens = []
  for (let i = 0; i < Math.min(total, 5); i++) {
    const tokenId = await contract.methods
      .tokenOfOwnerByIndex(accountAddress, i)
      .call()
    tokens.push(tokenId)
  }
  return {
    total,
    tokens
  }
}

async function mintToken(web3js, tokenId, ownerAccount, gas) {
  const contract = await getRinkebyContract(web3js)
  const gasEstimate = await contract.methods
    .mint(tokenId)
    .estimateGas({
      from: ownerAccount,
      gas
    })

  if (gasEstimate == gas) {
    throw new Error('Not enough enough gas, send more.')
  }
  return contract.methods
    .mint(tokenId)
    .send({
      from: ownerAccount,
      gas: gasEstimate
    })
}

async function depositToGateway(web3js, tokenId, ownerAccount, gas) {
  const contract = await getRinkebyContract(web3js)
  const gasEstimate = await contract.methods
    .depositToGateway(common.rinkebyGatewayAddress, tokenId)
    .estimateGas({
      from: ownerAccount,
      gas
    })
  if (gasEstimate == gas) {
    throw new Error('Not enough enough gas, send more.')
  }
  return contract.methods
    .depositToGateway(common.rinkebyGatewayAddress, tokenId)
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
  const total = await contract.methods
    .balanceOf(addr)
    .call({
      from: addr
    })
  const tokens = []
  for (let i = 0; i < Math.min(total, 5); i++) {
    const tokenId = await contract.methods
      .tokenOfOwnerByIndex(addr, i)
      .call({
        from: addr
      })
    tokens.push(tokenId)
  }
  return {
    total,
    tokens
  }
}

async function depositToExtdevGateway({
  client,
  web3js,
  tokenId,
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
    .approve(common.extdevGatewayAddress.toLowerCase(), tokenId)
    .send({
      from: ownerExtdevAddress
    })
  console.log('approved: ' + common.extdevGatewayAddress + 'to transfer' + tokenId)

  const ownerRinkebyAddr = common.Address.fromString(`eth:${ownerRinkebyAddress}`)
  const receiveSignedWithdrawalEvent = new Promise((resolve, reject) => {
    let timer = setTimeout(
      () => reject(new Error('Timeout while waiting for withdrawal to be signed')),
      timeout
    )
    const listener = event => {
      const tokenEthAddr =common.Address.fromString(`eth:${tokenRinkebyAddress}`)
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
  await gatewayContract.withdrawERC721Async(new BN(tokenId), tokenExtdevAddr, ownerRinkebyAddr)

  const event = await receiveSignedWithdrawalEvent
  return common.CryptoUtils.bytesToHexAddr(event.sig)
}

async function getRinkebyGatewayContract(web3js) {
  const networkId = await web3js.eth.net.getId()
  return new web3js.eth.Contract(
    RinkebyGatewayJSON.abi,
    RinkebyGatewayJSON.networks[networkId].address
  )
}

async function withdrawFromRinkebyGateway({
  web3js,
  tokenId,
  accountAddress,
  signature,
  gas
}) {
  const gatewayContract = await common.getRinkebyGatewayContract(web3js)
  const networkId = await web3js.eth.net.getId()

  const gasEstimate = await gatewayContract.methods
    .withdrawERC721(tokenId, signature, RinkebyJSON.networks[networkId].address)
    .estimateGas({
      from: accountAddress,
      gas
    })

  if (gasEstimate == gas) {
    throw new Error('Not enough enough gas, send more.')
  }

  console.log('gasEstimate ' + gasEstimate)

  return gatewayContract.methods
    .withdrawERC721(tokenId, signature, RinkebyJSON.networks[networkId].address)
    .send({
      from: accountAddress,
      gas: gasEstimate
    })
}

module.exports = {
  RinkebyJSON: RinkebyJSON,
  ExtdevJSON: ExtdevJSON,
  getRinkebyContract: getRinkebyContract,
  getRinkebyBalance: getRinkebyBalance,
  mintToken: mintToken,
  depositToGateway: depositToGateway,
  getExtdevBalance: getExtdevBalance,
  depositToExtdevGateway: depositToExtdevGateway,
  withdrawFromRinkebyGateway: withdrawFromRinkebyGateway,
}
