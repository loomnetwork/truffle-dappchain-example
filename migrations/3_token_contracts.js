const fs = require('fs')
const path = require('path')

const MyToken = artifacts.require('./MyToken.sol')
const MyCoin = artifacts.require('./MyCoin.sol')

const gatewayAddress = '0x6f7Eb868b2236638c563af71612c9701AC30A388'

module.exports = function (deployer, network, accounts) {
  deployer.then(async () => {
    await deployer.deploy(MyToken, gatewayAddress)
    const myTokenInstance = await MyToken.deployed()

    await deployer.deploy(MyCoin, gatewayAddress)
    const myCoinInstance = await MyCoin.deployed()
        
    console.log('\n*************************************************************************\n')
    console.log(`MyToken Contract Address: ${myTokenInstance.address}`)
    console.log(`MyCoin Contract Address: ${myCoinInstance.address}`)
    console.log('\n*************************************************************************\n')
  })
}
