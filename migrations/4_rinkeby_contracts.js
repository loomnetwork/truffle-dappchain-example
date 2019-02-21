const MyRinkebyToken = artifacts.require('./MyRinkebyToken.sol')
const MyRinkebyCoin = artifacts.require('./MyRinkebyCoin.sol')
const MyNewRinkebyToken = artifacts.require('./MyNewRinkebyToken.sol')
const MyERC721XRinkebyToken = artifacts.require('./MyERC721XRinkebyToken.sol')

const gatewayAddress = '0xe754d9518bf4a9c63476891ef9AA7d91C8236A5D'

module.exports = function (deployer, network, accounts) {
  if (network !== 'rinkeby') {
    return
  }

  deployer.then(async () => {
    await deployer.deploy(MyRinkebyToken)
    const myTokenInstance = await MyRinkebyToken.deployed()

    await deployer.deploy(MyNewRinkebyToken, gatewayAddress)
    const myNewTokenInstance = await MyNewRinkebyToken.deployed()

    await deployer.deploy(MyERC721XRinkebyToken, gatewayAddress)
    const myERC721XRinkebyTokenInstance = await MyERC721XRinkebyToken.deployed()

    await deployer.deploy(MyRinkebyCoin)
    const myCoinInstance = await MyRinkebyCoin.deployed()

    console.log('\n*************************************************************************\n')
    console.log(`MyRinkebyToken Contract Address: ${myTokenInstance.address}`)
    console.log(`MyNewToken Contract Address: ${myNewTokenInstance.address}`)
    console.log(`MyRinkebyCoin Contract Address: ${myCoinInstance.address}`)
    console.log(`MyRinkebyERC721X Contract Address: ${myERC721XRinkebyTokenInstance.address}`)
    console.log('\n*************************************************************************\n')
  })
}
