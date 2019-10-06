const Tx = require('ethereumjs-tx')
const Web3 = require('web3')
const program = require('commander')
const fs = require('fs')
const path = require('path')
const {
    Client, NonceTxMiddleware, SignedTxMiddleware, Address, LocalAddress, CryptoUtils, LoomProvider,
    Contracts, createEthereumGatewayAsync, soliditySha3
} = require('loom-js')
// TODO: fix this export in loom-js
const { OfflineWeb3Signer } = require('loom-js/dist/solidity-helpers')
const BN = require('bn.js')
const { ethers } = require('ethers')

const MyRinkebyTokenJSON = require('./src/contracts/MyRinkebyToken.json')
const MyRinkebyCoinJSON = require('./src/contracts/MyRinkebyCoin.json')
const MyTokenJSON = require('./src/contracts/MyToken.json')
const MyCoinJSON = require('./src/contracts/MyCoin.json')

const TransferGateway = Contracts.TransferGateway
const AddressMapper = Contracts.AddressMapper
const EthCoin = Contracts.EthCoin

// See https://loomx.io/developers/en/testnet-plasma.html#ethereum-integration
// for the most up to date address.
const rinkebyGatewayAddress = '0x9c67fD4eAF0497f9820A3FBf782f81D6b6dC4Baa'
const extdevGatewayAddress = '0xE754d9518bF4a9C63476891eF9Aa7D91c8236a5d'
const extdevChainId = 'extdev-plasma-us1'

const coinMultiplier = new BN(10).pow(new BN(18))

async function getRinkebyCoinContract(web3js) {
  const networkId = await web3js.eth.net.getId()
  return new web3js.eth.Contract(
    MyRinkebyCoinJSON.abi,
    MyRinkebyCoinJSON.networks[networkId].address
  )
}

async function getRinkebyCoinContractAddress(web3js) {
  const networkId = await web3js.eth.net.getId()
  return MyRinkebyCoinJSON.networks[networkId].address
}

async function getRinkebyCoinBalance(web3js, accountAddress) {
  const contract = await getRinkebyCoinContract(web3js)
  const balance = await contract.methods
    .balanceOf(accountAddress)
    .call()
  return balance
}

async function getRinkebyEthBalance(web3js, accountAddress) {
  const balance = await web3js.eth.getBalance(accountAddress);
  return balance
}

async function depositCoinToRinkebyGateway(web3js, amount, ownerAccount, gas) {
  const contract = await getRinkebyCoinContract(web3js)
  const contractAddress = await getRinkebyCoinContractAddress(web3js)
  const gateway  = await getRinkebyGatewayContract(web3js, ownerAccount)

  let gasEstimate = await contract.methods
    .approve(rinkebyGatewayAddress, amount.toString())
    .estimateGas({ from: ownerAccount.address })

  if (gasEstimate == gas) {
    throw new Error('Not enough enough gas, send more.')
  }

  await contract.methods
    .approve(rinkebyGatewayAddress, amount.toString())
    .send({ from: ownerAccount.address, gas: gasEstimate })
  
  const tx = await gateway.depositERC20Async(amount, contractAddress, { gasLimit: gas })
  return tx.hash
}

async function depositEthToRinkebyGateway(web3js, amount, unit, ownerAccount) {
  // the address that will send the test transaction
  const addressFrom = ownerAccount.address
  const privKey = ownerAccount.privateKey.slice(2)

  // the destination address
  const addressTo = rinkebyGatewayAddress

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
  return sendSigned(txData, function(err, result) {
    if (err) return console.log('error', err)
    console.log('sent', result)
  })

}

async function getRinkebyTokenContract(web3js) {
  const networkId = await web3js.eth.net.getId()
  return new web3js.eth.Contract(
    MyRinkebyTokenJSON.abi,
    MyRinkebyTokenJSON.networks[networkId].address
  )
}

// Returns an object containing the total number of tokens owned by the given account,
// and up to 5 token IDs.
async function getRinkebyTokenBalance(web3js, accountAddress) {
  const contract = await getRinkebyTokenContract(web3js)
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
  return { total, tokens }
}

async function mintToken(web3js, tokenId, ownerAccount, gas) {
  const contract = await getRinkebyTokenContract(web3js)

  const gasEstimate = await contract.methods
    .mint(tokenId)
    .estimateGas({ from: ownerAccount, gas })

  if (gasEstimate == gas) {
    throw new Error('Not enough enough gas, send more.')
  }

  return contract.methods
    .mint(tokenId)
    .send({ from: ownerAccount, gas: gasEstimate })
}

async function depositTokenToGateway(web3js, tokenId, ownerAccount, gas) {
  const contract = await getRinkebyTokenContract(web3js)

  const gasEstimate = await contract.methods
    .depositToGateway(rinkebyGatewayAddress, tokenId)
    .estimateGas({ from: ownerAccount, gas })

  if (gasEstimate == gas) {
    throw new Error('Not enough enough gas, send more.')
  }

  return contract.methods
    .depositToGateway(rinkebyGatewayAddress, tokenId)
    .send({ from: ownerAccount, gas: gasEstimate })
}

async function getExtdevCoinContract(web3js) {
  const networkId = await web3js.eth.net.getId()
  return new web3js.eth.Contract(
    MyCoinJSON.abi,
    MyCoinJSON.networks[networkId].address,
  )
}

async function getExtdevTokenContract(web3js) {
  const networkId = await web3js.eth.net.getId()
  return new web3js.eth.Contract(
    MyTokenJSON.abi,
    MyTokenJSON.networks[networkId].address,
  )
}

async function getExtdevCoinBalance(web3js, accountAddress) {
  const contract = await getExtdevCoinContract(web3js)
  const addr = accountAddress.toLowerCase()
  const balance = await contract.methods
    .balanceOf(addr)
    .call({ from: addr })
  return balance
}

async function getExtdevEthBalance(client, accountAddress) {
  const addr = Address.fromString(`${client.chainId}:${accountAddress}`)
  const ethCoin = await EthCoin.createAsync(client, addr);
  const balance = await ethCoin.getBalanceOfAsync(addr);
  return balance.toString();
}

async function getExtdevTokenBalance(web3js, accountAddress) {
  const contract = await getExtdevTokenContract(web3js)
  const addr = accountAddress.toLowerCase()
  const total = await contract.methods
    .balanceOf(addr)
    .call({ from: addr })
  const tokens = []
  for (let i = 0; i < Math.min(total, 5); i++) {
    const tokenId = await contract.methods
      .tokenOfOwnerByIndex(addr, i)
      .call({ from: addr })
    tokens.push(tokenId)
  }
  return { total, tokens }
}

// Returns a promise that will be resolved with the signed withdrawal receipt that contains the
// data that must be submitted to the Ethereum Gateway to withdraw ERC20 tokens.
async function depositCoinToExtdevGateway({
  client, web3js, amount,
  ownerExtdevAddress, ownerRinkebyAddress,
  tokenExtdevAddress, tokenRinkebyAddress, timeout
}) {
  const ownerExtdevAddr = Address.fromString(`${client.chainId}:${ownerExtdevAddress}`)
  const gatewayContract = await TransferGateway.createAsync(client, ownerExtdevAddr)

  const coinContract = await getExtdevCoinContract(web3js)
  try {
    await coinContract.methods
      .approve(extdevGatewayAddress.toLowerCase(), amount.toString())
      .send({ from: ownerExtdevAddress })
  } catch (err) {
    console.error('Withdraw failed while trying to approve token transfer to DAppChain Gateway.')
    throw err
  }

  const ownerRinkebyAddr = Address.fromString(`eth:${ownerRinkebyAddress}`)
  const receiveSignedWithdrawalEvent = new Promise((resolve, reject) => {
    let timer = setTimeout(
      () => reject(new Error('Timeout while waiting for withdrawal to be signed')),
      timeout
    )
    const listener = event => {
      const tokenEthAddr = Address.fromString(`eth:${tokenRinkebyAddress}`)
      if (
        event.tokenContract.toString() === tokenEthAddr.toString() &&
        event.tokenOwner.toString() === ownerRinkebyAddr.toString()
      ) {
        clearTimeout(timer)
        timer = null
        gatewayContract.removeAllListeners(TransferGateway.EVENT_TOKEN_WITHDRAWAL)
        resolve(event)
      }
    }
    gatewayContract.on(TransferGateway.EVENT_TOKEN_WITHDRAWAL, listener)
  })

  const tokenExtdevAddr = Address.fromString(`${client.chainId}:${tokenExtdevAddress}`)
  try {
    await gatewayContract.withdrawERC20Async(amount, tokenExtdevAddr, ownerRinkebyAddr)
    console.log(`${amount.div(coinMultiplier).toString()} tokens deposited to DAppChain Gateway...`)
  } catch (err) {
    console.error('Withdraw failed while trying to deposit tokens to DAppChain Gateway.')
    throw err
  }

  await receiveSignedWithdrawalEvent
  return gatewayContract.withdrawalReceiptAsync(ownerExtdevAddr)
}

// Returns a promise that will be resolved with the signed withdrawal receipt that contains the
// data that must be submitted to the Ethereum Gateway to withdraw ETH.
async function depositEthToExtdevGateway({
  client, amount,
  ownerExtdevAddress, ownerRinkebyAddress,
  timeout
}) {
  const ownerExtdevAddr = Address.fromString(`${client.chainId}:${ownerExtdevAddress}`)
  const gatewayContract = await TransferGateway.createAsync(client, ownerExtdevAddr)

  const ethCoin = await EthCoin.createAsync(client, ownerExtdevAddr);
  const extdevGatewayAddr = Address.fromString(`${client.chainId}:${extdevGatewayAddress}`)
  await ethCoin.approveAsync(extdevGatewayAddr, new BN(amount))

  const ownerRinkebyAddr = Address.fromString(`eth:${ownerRinkebyAddress}`)
  const rinkebyGatewayAddr = Address.fromString(`eth:${rinkebyGatewayAddress}`)

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
        gatewayContract.removeAllListeners(TransferGateway.EVENT_TOKEN_WITHDRAWAL)
        resolve(event)
      }
    }
    gatewayContract.on(TransferGateway.EVENT_TOKEN_WITHDRAWAL, listener)
  })

  await gatewayContract.withdrawETHAsync(new BN(amount), rinkebyGatewayAddr, ownerRinkebyAddr)
  console.log(`${amount.toString()} wei deposited to DAppChain Gateway...`)

  await receiveSignedWithdrawalEvent
  return gatewayContract.withdrawalReceiptAsync(ownerExtdevAddr)
}

// Returns a promise that will be resolved with the signed withdrawal receipt that contains the
// data that must be submitted to the Ethereum Gateway to withdraw an ERC721 token.
async function depositTokenToExtdevGateway({
  client, web3js, tokenId,
  ownerExtdevAddress, ownerRinkebyAddress,
  tokenExtdevAddress, tokenRinkebyAddress, timeout
}) {
  const ownerExtdevAddr = Address.fromString(`${client.chainId}:${ownerExtdevAddress}`)
  const gatewayContract = await TransferGateway.createAsync(client, ownerExtdevAddr)

  const coinContract = await getExtdevTokenContract(web3js)
  await coinContract.methods
    .approve(extdevGatewayAddress.toLowerCase(), tokenId)
    .send({ from: ownerExtdevAddress })

  const ownerRinkebyAddr = Address.fromString(`eth:${ownerRinkebyAddress}`)
  const receiveSignedWithdrawalEvent = new Promise((resolve, reject) => {
    let timer = setTimeout(
      () => reject(new Error('Timeout while waiting for withdrawal to be signed')),
      timeout
    )
    const listener = event => {
      const tokenEthAddr = Address.fromString(`eth:${tokenRinkebyAddress}`)
      if (
        event.tokenContract.toString() === tokenEthAddr.toString() &&
        event.tokenOwner.toString() === ownerRinkebyAddr.toString()
      ) {
        clearTimeout(timer)
        timer = null
        gatewayContract.removeAllListeners(TransferGateway.EVENT_TOKEN_WITHDRAWAL)
        resolve(event)
      }
    }
    gatewayContract.on(TransferGateway.EVENT_TOKEN_WITHDRAWAL, listener)
  })

  const tokenExtdevAddr = Address.fromString(`${client.chainId}:${tokenExtdevAddress}`)
  await gatewayContract.withdrawERC721Async(new BN(tokenId), tokenExtdevAddr, ownerRinkebyAddr)

  await receiveSignedWithdrawalEvent
  return gatewayContract.withdrawalReceiptAsync(ownerExtdevAddr)
}

async function getPendingWithdrawalReceipt(client, ownerAddress) {
  const ownerAddr = Address.fromString(`${client.chainId}:${ownerAddress}`)
  const gatewayContract = await TransferGateway.createAsync(client, ownerAddr)
  return gatewayContract.withdrawalReceiptAsync(ownerAddr)
}

async function getRinkebyGatewayContract(web3js, web3Account) {
  const networkId = await web3js.eth.net.getId()
  
  let version
  switch (networkId) {
    case 1: // Ethereum Mainnet
      version = 1
      break

    case 4: // Rinkeby
      version = 2
      break
  
    default:
      throw new Error('Ethereum Gateway is not deployed on network ' + networkId)
  }

  return createEthereumGatewayAsync(
    version,
    rinkebyGatewayAddress,
    new ethers.Wallet(web3Account.privateKey, new ethers.providers.Web3Provider(web3js.currentProvider))
  )
}

async function withdrawCoinFromRinkebyGateway({ web3js, web3Account, receipt, gas }) {
  const gatewayContract = await getRinkebyGatewayContract(web3js, web3Account)
  const tx = await gatewayContract.withdrawAsync(receipt, { gasLimit: gas })
  return tx.hash
}

async function withdrawEthFromRinkebyGateway({ web3js, web3Account, receipt, gas }) {
  const gatewayContract = await getRinkebyGatewayContract(web3js, web3Account)
  const tx = await gatewayContract.withdrawAsync(receipt, { gasLimit: gas })
  return tx.hash
}

async function withdrawTokenFromRinkebyGateway({ web3js, web3Account, receipt, gas }) {
  const gatewayContract = await getRinkebyGatewayContract(web3js, web3Account)
  const tx = await gatewayContract.withdrawAsync(receipt, { gasLimit: gas })
  return tx.hash
}

function loadRinkebyAccount() {
  const privateKey = fs.readFileSync(path.join(__dirname, './rinkeby_private_key'), 'utf-8')
  const web3js = new Web3(`https://rinkeby.infura.io/v3/${process.env.INFURA_API_KEY}`)
  const ownerAccount = web3js.eth.accounts.privateKeyToAccount('0x' + privateKey)
  web3js.eth.accounts.wallet.add(ownerAccount)
  return { account: ownerAccount, web3js }
}

function loadExtdevAccount() {
  const privateKeyStr = fs.readFileSync(path.join(__dirname, './extdev_private_key'), 'utf-8')
  const privateKey = CryptoUtils.B64ToUint8Array(privateKeyStr)
  const publicKey = CryptoUtils.publicKeyFromPrivateKey(privateKey)
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

  const hash = soliditySha3(
    { type: 'address', value: tokenRinkebyAddress.slice(2) },
    { type: 'address', value: tokenExtdevAddress.slice(2) }
  )

  const foreignContractCreatorSig = await signer.signAsync(hash)
  const foreignContractCreatorTxHash = Buffer.from(rinkebyTxHash.slice(2), 'hex')

  await gatewayContract.addContractMappingAsync({
    localContract,
    foreignContract,
    foreignContractCreatorSig,
    foreignContractCreatorTxHash
  })
}

async function mapAccounts({ client, signer, ownerRinkebyAddress, ownerExtdevAddress }) {
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

program
  .command('deposit-coin <amount>')
  .description('deposit the specified amount of ERC20 tokens into the Transfer Gateway')
  .option("-g, --gas <number>", "Gas for the tx")
  .action(async function(amount, options) {
    const { account, web3js } = loadRinkebyAccount()
    try {
      const actualAmount = new BN(amount).mul(coinMultiplier)
      const txHash = await depositCoinToRinkebyGateway(
        web3js, actualAmount, account, options.gas || 350000
      )
      console.log(`${amount} tokens deposited to Ethereum Gateway.`)
      console.log(`Rinkeby tx hash: ${txHash}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('deposit-eth <amount>')
  .description('deposit the specified amount of ETH into the Transfer Gateway')
  .option("-u, --unit <ethUnit>", "eth unit")
  .action(async function(amount, options) {
    const { account, web3js } = loadRinkebyAccount()
    try {
      let unit = options.unit;
      if(options.unit == null) {
        unit = 'wei'
      }

      const tx = await depositEthToRinkebyGateway(
        web3js, amount, unit, account
      )
      console.log(`${amount} ${unit} eth deposited to Ethereum Gateway.`)
      console.log(`Rinkeby tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('withdraw-coin <amount>')
  .description('withdraw the specified amount of ERC20 tokens via the Transfer Gateway')
  .option("-g, --gas <number>", "Gas for the tx")
  .option("--timeout <number>", "Number of seconds to wait for withdrawal to be processed")
  .action(async function(amount, options) {
    let client
    try {
      const extdev = loadExtdevAccount()
      const rinkeby = loadRinkebyAccount()
      client = extdev.client

      const actualAmount = new BN(amount).mul(coinMultiplier)
      const rinkebyNetworkId = await rinkeby.web3js.eth.net.getId()
      const extdevNetworkId = await extdev.web3js.eth.net.getId()
      const receipt = await depositCoinToExtdevGateway({
        client: extdev.client,
        web3js: extdev.web3js,
        amount: actualAmount,
        ownerExtdevAddress: extdev.account,
        ownerRinkebyAddress: rinkeby.account.address,
        tokenExtdevAddress: MyCoinJSON.networks[extdevNetworkId].address,
        tokenRinkebyAddress: MyRinkebyCoinJSON.networks[rinkebyNetworkId].address,
        timeout: options.timeout ? (options.timeout * 1000) : 120000
      })
      const txHash = await withdrawCoinFromRinkebyGateway({
        web3js: rinkeby.web3js,
        web3Account: rinkeby.account,
        receipt,
        gas: options.gas || 350000
      })
      console.log(`${amount} tokens withdrawn from Ethereum Gateway.`)
      console.log(`Rinkeby tx hash: ${txHash}`)
    } catch (err) {
      console.error(err)
    } finally {
      if (client) {
        client.disconnect()
      }
    }
  })

program
  .command('withdraw-eth <amount>')
  .description('withdraw the specified amount of ETH via the Transfer Gateway')
  .option("-g, --gas <number>", "Gas for the tx")
  .option("-u, --unit <ethUnit>", "eth unit")
  .option("--timeout <number>", "Number of seconds to wait for withdrawal to be processed")
  .action(async function(amount, options) {
    let client
    let unit = options.unit
    let amountInEth
    if(unit == null) {
      unit = 'wei'
    }
    try {
      const extdev = loadExtdevAccount()
      const rinkeby = loadRinkebyAccount()
      client = extdev.client

      const actualAmount = new BN(rinkeby.web3js.utils.toWei(amount, unit))

      const receipt = await depositEthToExtdevGateway({
        client: client,
        amount: actualAmount,
        ownerExtdevAddress: extdev.account,
        ownerRinkebyAddress: rinkeby.account.address,
        timeout: options.timeout ? (options.timeout * 1000) : 120000
      })
      const txHash = await withdrawEthFromRinkebyGateway({
        web3js: rinkeby.web3js,
        web3Account: rinkeby.account,
        receipt,
        gas: options.gas || 350000
      })
      amountInEth = actualAmount.div(new BN(10).pow(new BN(18))).toString()
      console.log(`${actualAmount.toString()} wei (${amountInEth} in eth) withdrawn from Ethereum Gateway.`)
      console.log(`Rinkeby tx hash: ${txHash}`)
    } catch (err) {
      console.error(err)
    } finally {
      if (client) {
        client.disconnect()
      }
    }
  })

  program
  .command('withdraw-token <uid>')
  .description('withdraw the specified ERC721 token via the Transfer Gateway')
  .option("-g, --gas <number>", "Gas for the tx")
  .option("--timeout <number>", "Number of seconds to wait for withdrawal to be processed")
  .action(async function(uid, options) {
    let client
    try {
      const extdev = loadExtdevAccount()
      const rinkeby = loadRinkebyAccount()
      client = extdev.client

      const rinkebyNetworkId = await rinkeby.web3js.eth.net.getId()
      const extdevNetworkId = await extdev.web3js.eth.net.getId()
      const receipt = await depositTokenToExtdevGateway({
        client: extdev.client,
        web3js: extdev.web3js,
        tokenId: uid,
        ownerExtdevAddress: extdev.account,
        ownerRinkebyAddress: rinkeby.account.address,
        tokenExtdevAddress: MyTokenJSON.networks[extdevNetworkId].address,
        tokenRinkebyAddress: MyRinkebyTokenJSON.networks[rinkebyNetworkId].address,
        timeout: options.timeout ? (options.timeout * 1000) : 120000
      })
      console.log(`Token ${uid} deposited to DAppChain Gateway...`)
      const txHash = await withdrawTokenFromRinkebyGateway({
        web3js: rinkeby.web3js,
        web3Account: rinkeby.account,
        receipt,
        gas: options.gas || 350000
      })
      console.log(`Token ${uid} withdrawn from Ethereum Gateway.`)
      console.log(`Rinkeby tx hash: ${txHash}`)
    } catch (err) {
      console.error(err)
    } finally {
      if (client) {
        client.disconnect()
      }
    }
  })

program
  .command('resume-withdrawal')
  .description('attempt to complete a pending withdrawal via the Transfer Gateway')
  .option("-g, --gas <number>", "Gas for the tx")
  .action(async function(options) {
    let client
    try {
      const extdev = loadExtdevAccount()
      const rinkeby = loadRinkebyAccount()
      client = extdev.client

      const networkId = await rinkeby.web3js.eth.net.getId()
      const myRinkebyCoinAddress = Address.fromString(`eth:${MyRinkebyCoinJSON.networks[networkId].address}`)
      const myRinkebyTokenAddress = Address.fromString(`eth:${MyRinkebyTokenJSON.networks[networkId].address}`)
      const myRinkebyGatewayAddress = Address.fromString(`eth:${rinkebyGatewayAddress}`)
      const receipt = await getPendingWithdrawalReceipt(extdev.client, extdev.account)

      if (receipt.tokenContract.toString() === myRinkebyCoinAddress.toString()) {
        console.log(`Found pending withdrawal of ${receipt.tokenAmount.div(coinMultiplier).toString()} coins.`)
        const txHash = await withdrawCoinFromRinkebyGateway({
          web3js: rinkeby.web3js,
          web3Account: rinkeby.account,
          receipt,
          gas: options.gas || 350000
        })
        console.log(`${receipt.tokenAmount.div(coinMultiplier).toString()} tokens withdrawn from Etheruem Gateway.`)
        console.log(`Rinkeby tx hash: ${txHash}`)
      } else if (receipt.tokenContract.toString() === myRinkebyTokenAddress.toString()){
        console.log(`Found pending withdrawal of token ${receipt.tokenId.toString()}.`)
        const txHash = await withdrawTokenFromRinkebyGateway({
          web3js: rinkeby.web3js,
          web3Account: rinkeby.account,
          receipt,
          gas: options.gas || 350000
        })
        console.log(`Token ${receipt.tokenId.toString()} withdrawn from Ethereum Gateway.`)
        console.log(`Rinkeby tx hash: ${txHash}`)
      } else if (receipt.tokenContract.toString() === myRinkebyGatewayAddress.toString()) {
        console.log(`Found pending withdrawal of ${amountInEth.toString()} ETH.`)
        const txHash = await withdrawEthFromRinkebyGateway({
          web3js: rinkeby.web3js,
          web3Account: rinkeby.account,
          receipt,
          gas: options.gas || 350000
        })
        let amountInWei = new BN(receipt.tokenAmount)
        let amountInEth = amountInWei.div(new BN(10).pow(new BN(18)))
        console.log(`${amountInWei.toString()} wei (${amountInEth.toString()} in eth) withdrawn from Etheruem Gateway.`)
        console.log(`Rinkeby tx hash: ${txHash}`)
      } else {
        console.log("Unsupported asset type!")
      }
    } catch (err) {
      console.error(err)
    } finally {
      if (client) {
        client.disconnect()
      }
    }
  })


program
  .command('coin-balance')
  .description('display the current ERC20 token balance for an account')
  .option('-c, --chain <chain ID>', '"eth" for Rinkeby, "extdev" for PlasmaChain')
  .option('-a, --account <hex address> | gateway', 'Account address')
  .action(async function(options) {
    try {
      let ownerAddress, balance
      if (options.chain === 'eth') {
        const { account, web3js } = loadRinkebyAccount()
        ownerAddress = account.address
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? rinkebyGatewayAddress : options.account
        }
        balance = await getRinkebyCoinBalance(web3js, ownerAddress)
      } else {
        const { account, web3js, client } = loadExtdevAccount()
        ownerAddress = account
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? extdevGatewayAddress : options.account
        }
        try {
        balance = await getExtdevCoinBalance(web3js, ownerAddress)
        } catch (err) {
          throw err
        } finally {
          client.disconnect()
        }
      }
      console.log(`${ownerAddress} balance is ${new BN(balance).div(coinMultiplier).toString()}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('eth-balance')
  .description('display the current ETH balance for an account')
  .option('-c, --chain <chain ID>', '"eth" for Rinkeby, "extdev" for PlasmaChain')
  .option('-a, --account <hex address> | gateway', 'Account address')
  .action(async function(options) {
    try {
      let ownerAddress, balance, balanceInEth
      if (options.chain === 'eth') {
        const { account, web3js } = loadRinkebyAccount()
        ownerAddress = account.address

        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? rinkebyGatewayAddress : options.account
        }
        balance = await getRinkebyEthBalance(web3js, ownerAddress)
      } else {
        const { account, web3js, client } = loadExtdevAccount()
        ownerAddress = account
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? extdevGatewayAddress : options.account
        }
        try {
        balance = await getExtdevEthBalance(client, ownerAddress)
        } catch (err) {
          throw err
        } finally {
          client.disconnect()
        }
      }
      balanceInEth = (new BN(balance).div(new BN(10).pow(new BN(18)))).toString()
      balance = parseInt(balance);
      console.log(`${ownerAddress} eth balance is ${balance} in wei (${balanceInEth} in eth)`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('deposit-token <uid>')
  .description('deposit an ERC721 token into the Transfer Gateway')
  .option("-g, --gas <number>", "Gas for the tx")
  .action(async function(uid, options) {
    const { account, web3js } = loadRinkebyAccount()
    try {
      const tx = await depositTokenToGateway(web3js, uid, account.address, options.gas || 350000)
      console.log(`Token ${uid} deposited, Rinkeby tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('mint-token <uid>')
  .description('mint an ERC721 token on Rinkeby')
  .option("-g, --gas <number>", "Gas for the tx")
  .action(async function(uid, options) {
    const { account, web3js } = loadRinkebyAccount()
    try {
      const tx = await mintToken(web3js, uid, account.address, options.gas || 350000)
      console.log(`Token ${uid} minted, Rinkeby tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('token-balance')
  .description('display the current ERC721 token balance for an account')
  .option('-c, --chain <chain ID>', '"eth" for Rinkeby, "extdev" for PlasmaChain')
  .option('-a, --account <hex address>', 'Account address')
  .action(async function(options) {
    try {
      let ownerAddress, balance
      if (options.chain === 'eth') {
        const { account, web3js } = loadRinkebyAccount()
        ownerAddress = account.address
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? rinkebyGatewayAddress : options.account
        }
        balance = await getRinkebyTokenBalance(web3js, ownerAddress)
      } else {
        const { account, web3js, client } = loadExtdevAccount()
        ownerAddress = account
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? extdevGatewayAddress : options.account
        }
        try {
          balance = await getExtdevTokenBalance(web3js, ownerAddress)
        } catch (err) {
          throw err
        } finally {
          client.disconnect()
        }
      }
      console.log(`\n${ownerAddress} owns ${balance.total} tokens.\n`)
      if (balance.tokens.length > 0) {
        console.log(`First ${balance.tokens.length} token(s): ${balance.tokens}`)
      }
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('map-contracts <contract-type>')
  .description('maps contracts')
  .action(async function(contractType, options) {
    let client
    try {
      const rinkeby = loadRinkebyAccount()
      const extdev = loadExtdevAccount()
      client = extdev.client
      const rinkebyNetworkId = await rinkeby.web3js.eth.net.getId()
      const extdevNetworkId = await extdev.web3js.eth.net.getId()

      let tokenRinkebyAddress, tokenExtdevAddress, rinkebyTxHash
      if (contractType === 'coin') {
        tokenRinkebyAddress = MyRinkebyCoinJSON.networks[rinkebyNetworkId].address
        rinkebyTxHash = MyRinkebyCoinJSON.networks[rinkebyNetworkId].transactionHash
        tokenExtdevAddress = MyCoinJSON.networks[extdevNetworkId].address
      } else if (contractType === 'token') {
        tokenRinkebyAddress = MyRinkebyTokenJSON.networks[rinkebyNetworkId].address
        rinkebyTxHash = MyRinkebyTokenJSON.networks[rinkebyNetworkId].transactionHash
        tokenExtdevAddress = MyTokenJSON.networks[extdevNetworkId].address
      } else {
        console.log('Specify which contracts you wish to map, "coin" or "token"')
        return
      }

      const signer = new OfflineWeb3Signer(rinkeby.web3js, rinkeby.account)
      await mapContracts({
        client,
        signer,
        tokenRinkebyAddress,
        tokenExtdevAddress,
        ownerExtdevAddress: extdev.account,
        rinkebyTxHash
      })
      console.log(`Submitted request to map ${tokenExtdevAddress} to ${tokenRinkebyAddress}`)
    } catch (err) {
      console.error(err)
    } finally {
      if (client) {
        client.disconnect()
      }
    }
  })

program
  .command('map-accounts')
  .description('maps accounts')
  .action(async function() {
    let client
    try {
      const rinkeby = loadRinkebyAccount()
      const extdev = loadExtdevAccount()
      client = extdev.client

      const signer = new OfflineWeb3Signer(rinkeby.web3js, rinkeby.account)
      await mapAccounts({
        client,
        signer,
        ownerRinkebyAddress: rinkeby.account.address,
        ownerExtdevAddress: extdev.account
      })
    } catch (err) {
      console.error(err)
    } finally {
      if (client) {
        client.disconnect()
      }
    }
  })

program
  .version('0.1.0')
  .parse(process.argv)
