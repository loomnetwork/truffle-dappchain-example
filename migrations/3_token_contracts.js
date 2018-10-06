const MyToken = artifacts.require('./MyToken.sol')
const MyCoin = artifacts.require('./MyCoin.sol')

const gatewayAddress = '0xE754d9518bF4a9C63476891eF9Aa7D91c8236a5d'

module.exports = function (deployer, network, accounts) {
  if (network === 'rinkeby') {
    return
  }

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
