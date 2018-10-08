const MyRinkebyToken = artifacts.require('./MyRinkebyToken.sol')
const MyRinkebyCoin = artifacts.require('./MyRinkebyCoin.sol')

module.exports = function (deployer, network, accounts) {
  if (network !== 'rinkeby') {
    return
  }

  deployer.then(async () => {
    await deployer.deploy(MyRinkebyToken)
    const myTokenInstance = await MyRinkebyToken.deployed()

    await deployer.deploy(MyRinkebyCoin)
    const myCoinInstance = await MyRinkebyCoin.deployed()
        
    console.log('\n*************************************************************************\n')
    console.log(`MyRinkebyToken Contract Address: ${myTokenInstance.address}`)
    console.log(`MyRinkebyCoin Contract Address: ${myCoinInstance.address}`)
    console.log('\n*************************************************************************\n')
  })
}
