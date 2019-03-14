const util = require('util')
const Tx = require('ethereumjs-tx')
const program = require('commander')
const common = require('./src/common.js');
const eth = require('./src/eth.js');
const coin = require('./src/coin.js');
const token = require('./src/token.js');
const erc721x = require('./src/erc721x.js');
const reverse = require('./src/reverse.js');

// TODO: fix this export in loom-js
const {
  OfflineWeb3Signer
} = require('loom-js/dist/solidity-helpers')
const BN = require('bn.js')

program
  .command('deposit-coin <amount>')
  .description('deposit the specified amount of ERC20 tokens into the Transfer Gateway')
  .option("-g, --gas <number>", "Gas for the tx")
  .action(async function (amount, options) {
    const {
      account,
      web3js
    } = common.loadRinkebyAccount()
    try {
      const actualAmount = new BN(amount).mul(common.coinMultiplier)
      const tx = await coin.depositToRinkebyGateway(
        web3js, actualAmount, account.address, options.gas || 350000
      )
      console.log(`${amount} tokens deposited to Ethereum Gateway.`)
      console.log(`Rinkeby tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('deposit-eth <amount>')
  .description('deposit the specified amount of ETH into the Transfer Gateway')
  .option("-u, --unit <ethUnit>", "eth unit")
  .action(async function (amount, options) {
    const {
      account,
      web3js
    } = common.loadRinkebyAccount()
    try {
      let unit = options.unit;
      if (options.unit == null) {
        unit = 'wei'
      }

      const tx = await eth.depositToRinkebyGateway(
        web3js, amount, unit, account
      )
      console.log(`${amount} ${unit} eth deposited to Ethereum Gateway.`)
      console.log(`Rinkeby tx: `)
      console.log(tx)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('withdraw-coin <amount>')
  .description('withdraw the specified amount of ERC20 tokens via the Transfer Gateway')
  .option("-g, --gas <number>", "Gas for the tx")
  .option("--timeout <number>", "Number of seconds to wait for withdrawal to be processed")
  .action(async function (amount, options) {
    let client
    try {
      const extdev = common.loadExtdevAccount()
      const rinkeby = common.loadRinkebyAccount()
      client = extdev.client

      const actualAmount = new BN(amount).mul(common.coinMultiplier)
      const rinkebyNetworkId = await rinkeby.web3js.eth.net.getId()
      const extdevNetworkId = await extdev.web3js.eth.net.getId()
      const signature = await coin.depositToExtdevGateway({
        client: extdev.client,
        web3js: extdev.web3js,
        amount: actualAmount,
        ownerExtdevAddress: extdev.account,
        ownerRinkebyAddress: rinkeby.account.address,
        tokenExtdevAddress: coin.ExtdevJSON.networks[extdevNetworkId].address,
        tokenRinkebyAddress: coin.RinkebyJSON.networks[rinkebyNetworkId].address,
        timeout: options.timeout ? (options.timeout * 1000) : 120000
      })
      const tx = await coin.withdrawFromRinkebyGateway({
        web3js: rinkeby.web3js,
        amount: actualAmount,
        accountAddress: rinkeby.account.address,
        signature,
        gas: options.gas || 350000
      })
      console.log(`${amount} tokens withdrawn from Ethereum Gateway.`)
      console.log(`Rinkeby tx hash: ${tx.transactionHash}`)
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
  .description('withdraw the specified amount of  eth via the Transfer Gateway')
  .option("-g, --gas <number>", "Gas for the tx")
  .option("-u, --unit <ethUnit>", "eth unit")
  .option("--timeout <number>", "Number of seconds to wait for withdrawal to be processed")
  .action(async function (amount, options) {
    let client
    let unit = options.unit
    let amountInEth
    if (unit == null) {
      unit = 'wei'
    }
    try {
      const extdev = common.loadExtdevAccount()
      const rinkeby = common.loadRinkebyAccount()
      client = extdev.client

      const actualAmount = new BN(rinkeby.web3js.utils.toWei(amount, unit))

      const signature = await eth.depositToExtdevGateway({
        client: client,
        amount: actualAmount,
        ownerExtdevAddress: extdev.account,
        ownerRinkebyAddress: rinkeby.account.address,
        timeout: options.timeout ? (options.timeout * 1000) : 120000
      })
      const tx = await eth.withdrawFromRinkebyGateway({
        web3js: rinkeby.web3js,
        amount: actualAmount,
        accountAddress: rinkeby.account.address,
        signature,
        gas: options.gas || 350000
      })
      amountInEth = actualAmount.div(new BN(10).pow(new BN(18))).toString()
      console.log(`${actualAmount.toString()} wei (${amountInEth} in eth) withdrawn from Ethereum Gateway.`)
      console.log(`Rinkeby tx hash: ${tx.transactionHash}`)
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
  .action(async function (uid, options) {
    let client
    try {
      const extdev = common.loadExtdevAccount()
      const rinkeby = common.loadRinkebyAccount()
      client = extdev.client

      const rinkebyNetworkId = await rinkeby.web3js.eth.net.getId()
      const extdevNetworkId = await extdev.web3js.eth.net.getId()
      const signature = await token.depositToExtdevGateway({
        client: extdev.client,
        web3js: extdev.web3js,
        tokenId: uid,
        ownerExtdevAddress: extdev.account,
        ownerRinkebyAddress: rinkeby.account.address,
        tokenExtdevAddress: token.ExtdevJSON.networks[extdevNetworkId].address,
        tokenRinkebyAddress: token.RinkebyJSON.networks[rinkebyNetworkId].address,
        timeout: options.timeout ? (options.timeout * 1000) : 120000
      })
      console.log(`Token ${uid} deposited to DAppChain Gateway...`)
      const tx = await token.withdrawFromRinkebyGateway({
        web3js: rinkeby.web3js,
        tokenId: uid,
        accountAddress: rinkeby.account.address,
        signature,
        gas: options.gas || 350000
      })
      console.log(`Token ${uid} withdrawn from Ethereum Gateway.`)
      console.log(`Rinkeby tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    } finally {
      if (client) {
        client.disconnect()
      }
    }
  })

program
  .command('withdraw-erc721x <uid> <amount>')
  .description('withdraw the specified ERC721X via the Transfer Gateway')
  .option("--timeout <number>", "Number of seconds to wait for withdrawal to be processed")
  .action(async function (uid, amount, options) {
    let client
    try {
      const extdev = common.loadExtdevAccount()
      const rinkeby = common.loadRinkebyAccount()
      client = extdev.client

      const rinkebyNetworkId = await rinkeby.web3js.eth.net.getId()
      const extdevNetworkId = await extdev.web3js.eth.net.getId()
      const signature = await erc721x.depositTokenToExtdevGateway({
        client: extdev.client,
        web3js: extdev.web3js,
        tokenId: uid,
        ownerExtdevAddress: extdev.account,
        ownerRinkebyAddress: rinkeby.account.address,
        tokenExtdevAddress: erc721x.ExtdevJSON.networks[extdevNetworkId].address,
        tokenRinkebyAddress: erc721x.RinkebyJSON.networks[rinkebyNetworkId].address,
        timeout: options.timeout ? (options.timeout * 1000) : 120000,
        amount
      })
      console.log(`Token ${uid} deposited to DAppChain Gateway...`)
      const tx = await erc721x.withdrawTokenFromRinkebyGateway({
        web3js: rinkeby.web3js,
        tokenId: uid,
        accountAddress: rinkeby.account.address,
        signature,
        gas: options.gas || 350000,
        amount
      })
      console.log(`Token ${uid} withdrawn from Ethereum Gateway.`)
      console.log(`Rinkeby tx hash: ${tx.transactionHash}`)
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
  .action(async function (options) {
    let client
    try {
      const extdev = common.loadExtdevAccount()
      const rinkeby = common.loadRinkebyAccount()
      client = extdev.client

      const networkId = await rinkeby.web3js.eth.net.getId()
      const myRinkebyCoinAddress = common.Address.fromString(`eth:${coin.RinkebyJSON.networks[networkId].address}`)
      const myRinkebyTokenAddress = common.Address.fromString(`eth:${token.RinkebyJSON.networks[networkId].address}`)
      const myRinkebyGatewayAddress = common.Address.fromString(`eth:${common.rinkebyGatewayAddress}`)
      const receipt = await common.getPendingWithdrawalReceipt(extdev.client, extdev.account)
      const signature = common.CryptoUtils.bytesToHexAddr(receipt.oracleSignature)

      if (receipt.tokenContract.toString() === myRinkebyCoinAddress.toString()) {
        const tx = await coin.withdrawFromRinkebyGateway({
          web3js: rinkeby.web3js,
          amount: receipt.tokenAmount,
          accountAddress: rinkeby.account.address,
          signature,
          gas: options.gas || 350000
        })
        console.log(`${receipt.tokenAmount.div(common.coinMultiplier).toString()} tokens withdrawn from Etheruem Gateway.`)
        console.log(`Rinkeby tx hash: ${tx.transactionHash}`)
      } else if (receipt.tokenContract.toString() === myRinkebyTokenAddress.toString()) {
        const tx = await token.withdrawFromRinkebyGateway({
          web3js: rinkeby.web3js,
          tokenId: receipt.tokenId,
          accountAddress: rinkeby.account.address,
          signature,
          gas: options.gas || 350000
        })
        console.log(`Token ${receipt.tokenId.toString()} withdrawn from Ethereum Gateway.`)
        console.log(`Rinkeby tx hash: ${tx.transactionHash}`)
      } else if (receipt.tokenContract.toString() === myRinkebyGatewayAddress.toString()) {
        const tx = await eth.withdrawFromRinkebyGateway({
          web3js: rinkeby.web3js,
          amount: receipt.tokenAmount,
          accountAddress: rinkeby.account.address,
          signature,
          gas: options.gas || 350000
        })
        let amountInWei = new BN(receipt.tokenAmount)
        let amountInEth = amountInWei.div(new BN(10).pow(new BN(18)))
        console.log(`${amountInWei.toString()} wei (${amountInEth.toString()} in eth) withdrawn from Etheruem Gateway.`)
        console.log(`Rinkeby tx hash: ${tx.transactionHash}`)
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
  .action(async function (options) {
    try {
      let ownerAddress, balance
      if (options.chain === 'eth') {
        const {
          account,
          web3js
        } = common.loadRinkebyAccount()
        ownerAddress = account.address
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? common.rinkebyGatewayAddress : options.account
        }
        balance = await coin.getRinkebyBalance(web3js, ownerAddress)
      } else {
        const {
          account,
          web3js,
          client
        } = common.loadExtdevAccount()
        ownerAddress = account
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? common.extdevGatewayAddress : options.account
        }
        try {
          balance = await coin.getExtdevBalance(web3js, ownerAddress)
        } catch (err) {
          throw err
        } finally {
          client.disconnect()
        }
      }
      console.log(`${ownerAddress} balance is ${new BN(balance).div(common.coinMultiplier).toString()}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('eth-balance')
  .description('display the current ETH balance for an account')
  .option('-c, --chain <chain ID>', '"eth" for Rinkeby, "extdev" for PlasmaChain')
  .option('-a, --account <hex address> | gateway', 'Account address')
  .action(async function (options) {
    try {
      let ownerAddress, balance, balanceInEth
      if (options.chain === 'eth') {
        const {
          account,
          web3js
        } = common.loadRinkebyAccount()
        ownerAddress = account.address

        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? common.rinkebyGatewayAddress : options.account
        }
        balance = await eth.getRinkebyBalance(web3js, ownerAddress)
      } else {
        const {
          account,
          web3js,
          client
        } = common.loadExtdevAccount()
        ownerAddress = account
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? common.extdevGatewayAddress : options.account
        }
        try {
          balance = await eth.getExtdevBalance(client, ownerAddress)
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
  .action(async function (uid, options) {
    const {
      account,
      web3js
    } = common.loadRinkebyAccount()
    try {
      const tx = await token.depositToGateway(web3js, uid, account.address, options.gas || 350000)
      console.log(`Token ${uid} deposited, Rinkeby tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('deposit-ft <uid> <amount>')
  .description('deposit ERC721X ft into the Transfer Gateway')
  .option("-g, --gas <number>", "Gas for the tx")
  .action(async function (uid, amount, options) {
    const {
      account,
      web3js
    } = common.loadRinkebyAccount()
    try {
      const tx = await erc721x.depositFTToGateway(web3js, uid, amount, account.address, options.gas || 350000)
      console.log(`Token ${uid} deposited, Rinkeby tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('deposit-nft <uid>')
  .description('deposit an ERC721X token into the Transfer Gateway')
  .option("-g, --gas <number>", "Gas for the tx")
  .action(async function (uid, options) {
    const {
      account,
      web3js
    } = common.loadRinkebyAccount()
    try {
      const tx = await erc721x.depositNFTToGateway(web3js, uid, account.address, options.gas || 350000)
      console.log(`Token ${uid} deposited, Rinkeby tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })

  program
  .command('deposit-ft-reverse <uid> <amount>')
  .description('deposit ERC721X FT into the Extdev Transfer Gateway')
  .action(async function (uid, amount, options) {
    const {
      account,
      web3js
    } = reverse.loadExtdevAccount()
    try {
      const tx = await reverse.depositFTToGateway(web3js, uid, amount, account)
      console.log(`Token ${uid} deposited, Extdev tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })


program
  .command('mint-token <uid>')
  .description('mint an ERC721 token on Rinkeby')
  .option("-g, --gas <number>", "Gas for the tx")
  .action(async function (uid, options) {
    const {
      account,
      web3js
    } = common.loadRinkebyAccount()
    try {
      const tx = await token.mintToken(web3js, uid, account.address, options.gas || 350000)
      console.log(`Token ${uid} minted, Rinkeby tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('mint-nft <uid>')
  .description('mint an ERC721X token on Rinkeby')
  .option("-g, --gas <number>", "Gas for the tx")
  .action(async function (uid, options) {
    const {
      account,
      web3js
    } = common.loadRinkebyAccount()
    try {
      const tx = await erc721x.mintNFT(web3js, uid, account.address, options.gas || 350000)
      console.log(`Token ${uid} minted, Rinkeby tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('mint-ft <uid> <amount>')
  .description('mint an ERC721X token on Rinkeby')
  .option("-g, --gas <number>", "Gas for the tx")
  .action(async function (uid, amount, options) {
    const {
      account,
      web3js
    } = common.loadRinkebyAccount()
    try {
      const tx = await erc721x.mintFT(web3js, uid, amount, account.address, options.gas || 350000)
      console.log(`Token ${uid} minted, Rinkeby tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('mint-ft-reverse <uid> <amount>')
  .description('mint an ERC721X token on Extdev')
  .action(async function (uid, amount, options) {
    const {
      account,
      web3js
    } = reverse.loadExtdevAccount()
    try {
      //const tx = await reverse.mintFT(web3js, uid, amount, account)
      //console.log(`Token ${uid} minted, Extdev tx hash: ${tx.transactionHash}`)
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('erc721x-balance')
  .description('display the current ERC721 token balance for an account')
  .option('-c, --chain <chain ID>', '"eth" for Rinkeby, "extdev" for PlasmaChain')
  .option('-a, --account <hex address>', 'Account address')
  .action(async function (options) {
    try {
      let ownerAddress, balance
      if (options.chain === 'eth') {
        const {
          account,
          web3js
        } = common.loadRinkebyAccount()
        ownerAddress = account.address
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? common.rinkebyGatewayAddress : options.account
        }
        const {
          indexes,
          balances
        } = await erc721x.getRinkebyBalance(web3js, ownerAddress)
        if (indexes && balances) {
          for (i = 0; i < indexes.length; i++) {
            console.log('Token id: ' + indexes[i] + ', balance: ' + balances[i])
          }
        }
      } else {
        const {
          account,
          web3js,
          client
        } = common.loadExtdevAccount()
        ownerAddress = account
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? common.extdevGatewayAddress : options.account
        }
        try {
          const {
            indexes,
            balances
          } = await erc721x.getExtdevBalance(web3js, ownerAddress)
          if (indexes && balances) {
		  for (i = 0; i < indexes.length; i++) {
              console.log('Token id: ' + indexes[i] + ', balance: ' + balances[i])
            }
          }
        } catch (err) {
          throw err
        } finally {
          if (client)
            client.disconnect()
        }
      }
    } catch (err) {
      console.error(err)
    }
  })

program
  .command('token-balance')
  .description('display the current ERC721 token balance for an account')
  .option('-c, --chain <chain ID>', '"eth" for Rinkeby, "extdev" for PlasmaChain')
  .option('-a, --account <hex address>', 'Account address')
  .action(async function (options) {
    try {
      let ownerAddress, balance
      if (options.chain === 'eth') {
        const {
          account,
          web3js
        } = common.loadRinkebyAccount()
        ownerAddress = account.address
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? common.rinkebyGatewayAddress : options.account
        }
        balance = await token.getRinkebyBalance(web3js, ownerAddress)
      } else {
        const {
          account,
          web3js,
          client
        } = common.loadExtdevAccount()
        ownerAddress = account
        if (options.account) {
          ownerAddress = (options.account === 'gateway') ? common.extdevGatewayAddress : options.account
        }
        try {
		balance = await token.getExtdevBalance(web3js, ownerAddress)
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
  .action(async function (contractType, options) {
    let client
    try {
      const rinkeby = common.loadRinkebyAccount()
      const extdev = common.loadExtdevAccount()
      client = extdev.client
      const rinkebyNetworkId = await rinkeby.web3js.eth.net.getId()
      const extdevNetworkId = await extdev.web3js.eth.net.getId()

      let tokenRinkebyAddress, tokenExtdevAddress, rinkebyTxHash
      if (contractType === 'coin') {
        tokenRinkebyAddress = coin.RinkebyJSON.networks[rinkebyNetworkId].address
        rinkebyTxHash = coin.RinkebyJSON.networks[rinkebyNetworkId].transactionHash
        tokenExtdevAddress = coin.ExtdevJSON.networks[extdevNetworkId].address
      } else if (contractType === 'token') {
        tokenRinkebyAddress = token.RinkebyJSON.networks[rinkebyNetworkId].address
        rinkebyTxHash = token.RinkebyJSON.networks[rinkebyNetworkId].transactionHash
        tokenExtdevAddress = token.ExtdevJSON.networks[extdevNetworkId].address
      } else if (contractType === 'erc721x') {
        tokenRinkebyAddress = erc721x.RinkebyJSON.networks[rinkebyNetworkId].address
        rinkebyTxHash = erc721x.RinkebyJSON.networks[rinkebyNetworkId].transactionHash
        tokenExtdevAddress = erc721x.ExtdevJSON.networks[extdevNetworkId].address
      } else {
        console.log('Specify which contracts you wish to map, "coin" or "token"')
        return
      }

      const signer = new OfflineWeb3Signer(rinkeby.web3js, rinkeby.account)
      await common.mapContracts({
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
  .action(async function () {
    let client
    try {
      const rinkeby = common.loadRinkebyAccount()
      const extdev = common.loadExtdevAccount()
      client = extdev.client

      const signer = new OfflineWeb3Signer(rinkeby.web3js, rinkeby.account)
      await common.mapAccounts({
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
