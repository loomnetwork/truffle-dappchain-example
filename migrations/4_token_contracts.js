const MyToken = artifacts.require('./MyToken.sol')
//const MyCoin = artifacts.require('./MyCoin.sol')
const MyERC721XToken = artifacts.require('./MyERC721XToken.sol')

const gatewayAddress = '0xe754d9518bf4a9c63476891ef9AA7d91C8236A5D'

module.exports = function (deployer, network, accounts) {
  if (network === 'rinkeby') {
    return
  }

  deployer.then(async () => {
    await deployer.deploy(MyToken, gatewayAddress)
    const myTokenInstance = await MyToken.deployed()

    await deployer.deploy(MyERC721XToken, gatewayAddress)
    const myERC721XTokenInstance = await MyERC721XToken.deployed()

    //await deployer.deploy(MyCoin, gatewayAddress)
    //const myCoinInstance = await MyCoin.deployed()

    console.log('\n*************************************************************************\n')
    console.log(`MyToken Contract Address: ${myTokenInstance.address}`)
    console.log(`MyERC721XToken Contract Address: ${myERC721XTokenInstance.address}`)
    //console.log(`MyCoin Contract Address: ${myCoinInstance.address}`)
    console.log('\n*************************************************************************\n')
  })
}
