const RinkebyJSON = require('./contracts/MyERC721XRinkebyToken.json')
const ExtdevJSON = require('./contracts/MyERC721XToken.json')
const BN = require('bn.js')
const common = require('./common.js')

async function getRinkebyContract(web3js) {
    const networkId = await web3js.eth.net.getId()
    return new web3js.eth.Contract(
        RinkebyJSON.abi,
        RinkebyJSON.networks[networkId].address
    )
}

async function getExtdevContract(web3js) {
    const networkId = await web3js.eth.net.getId()
    return new web3js.eth.Contract(
        ExtdevJSON.abi,
        ExtdevJSON.networks[networkId].address
    )
}

async function getRinkebyBalance(web3js, accountAddress) {
    const contract = await getRinkebyContract(web3js)
    const addr = accountAddress.toLowerCase()
    const {
        indexes,
        balances
    } = await contract.methods
        .tokensOwned(addr)
        .call()
    return {
        indexes,
        balances
    }
}

async function getExtdevBalance(web3js, accountAddress) {
    const contract = await getExtdevContract(web3js)
    const addr = accountAddress.toLowerCase()
    const {
        indexes,
        balances
    } = await contract.methods.tokensOwned(addr).call({
        from: addr
    })
    return {
        indexes,
        balances
    }
}

async function mintNFT(web3js, tokenId, ownerAccount, gas) {
    const contract = await getRinkebyContract(web3js)
    const gasEstimate = await contract.methods
        .mint(tokenId, ownerAccount)
        .estimateGas({
            from: ownerAccount,
            gas
        })
    if (gasEstimate == gas) {
        throw new Error('Not enough enough gas, send more.')
    }
    return contract.methods
        .mint(tokenId, ownerAccount)
        .send({
            from: ownerAccount,
            gas: gasEstimate
        })
}

async function mintFT(web3js, tokenId, amount, ownerAccount, gas) {
    const contract = await getRinkebyContract(web3js)
    const gasEstimate = await contract.methods
        .mint(tokenId, ownerAccount, amount)
        .estimateGas({
            from: ownerAccount,
            gas
        })
    if (gasEstimate == gas) {
        throw new Error('Not enough enough gas, send more.')
    }
    return contract.methods
        .mint(tokenId, ownerAccount, amount)
        .send({
            from: ownerAccount,
            gas: gasEstimate
        })
}

async function depositFTToGateway(web3js, tokenId, amount, ownerAccount, gas) {
    const contract = await getRinkebyContract(web3js)
    const gasEstimate = await contract.methods
        .depositToGateway(common.rinkebyGatewayAddress, tokenId, amount)
        .estimateGas({
            from: ownerAccount,
            gas
        })

    if (gasEstimate == gas) {
        throw new Error('Not enough enough gas, send more.')
    }
    return contract.methods
        .depositToGateway(common.rinkebyGatewayAddress, tokenId, amount)
        .send({
            from: ownerAccount,
            gas: gasEstimate
        })
}

async function depositNFTToGateway(web3js, tokenId, ownerAccount, gas) {
    const contract = await getRinkebyContract(web3js)
    const gasEstimate = await contract.methods
        .depositToGatewayNFT(common.rinkebyGatewayAddress, tokenId)
        .estimateGas({
            from: ownerAccount,
            gas
        })
    if (gasEstimate == gas) {
        throw new Error('Not enough enough gas, send more.')
    }
    return contract.methods
        .depositToGatewayNFT(common.rinkebyGatewayAddress, tokenId)
        .send({
            from: ownerAccount,
            gas: gasEstimate
        })
}

async function depositTokenToExtdevGateway({
    client,
    web3js,
    tokenId,
    ownerExtdevAddress,
    ownerRinkebyAddress,
    tokenExtdevAddress,
    tokenRinkebyAddress,
    timeout,
    amount
}) {
    const ownerExtdevAddr = common.Address.fromString(`${client.chainId}:${ownerExtdevAddress}`)
    const gatewayContract = await common.TransferGateway.createAsync(client, ownerExtdevAddr)
    const coinContract = await getExtdevContract(web3js)


    await coinContract.methods.setApprovalForAll(common.extdevGatewayAddress.toLowerCase(), true).send({
        'from': ownerExtdevAddress
    })
    //TODO: remove approval

    await coinContract.methods.depositToGatewayFT(tokenId, amount).send({
        'from': ownerExtdevAddress
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

    await gatewayContract.withdrawERC721XAsync(new BN(tokenId), new BN(amount), tokenExtdevAddr, ownerRinkebyAddr)
    const event = await receiveSignedWithdrawalEvent
    return common.CryptoUtils.bytesToHexAddr(event.sig)
}

async function withdrawTokenFromRinkebyGateway({
    web3js,
    tokenId,
    accountAddress,
    signature,
    gas,
    amount
}) {
    const gatewayContract = await common.getRinkebyGatewayContract(web3js)
    const networkId = await web3js.eth.net.getId()
    const amount = 1
    const gasEstimate = await gatewayContract.methods
        .withdrawERC721X(tokenId, amount, signature, RinkebyJSON.networks[networkId].address)
        .estimateGas({
            from: accountAddress,
            gas
        })

    if (gasEstimate == gas) {
        throw new Error('Not enough enough gas, send more.')
    }

    return gatewayContract.methods
        .withdrawERC721X(tokenId, amount, signature, RinkebyJSON.networks[networkId].address)
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
    getExtdevBalance: getExtdevBalance,
    mintNFT: mintNFT,
    mintFT: mintFT,
    depositFTToGateway: depositFTToGateway,
    depositNFTToGateway: depositNFTToGateway,
    depositTokenToExtdevGateway: depositTokenToExtdevGateway,
    withdrawTokenFromRinkebyGateway: withdrawTokenFromRinkebyGateway,
}
