var SimpleStore = artifacts.require("./SimpleStore.sol");

module.exports = function(deployer, network) {
  if (network === 'rinkeby') {
    return
  }

  deployer.deploy(SimpleStore);
};
