var SimpleStore = artifacts.require("./SimpleStore.sol");

module.exports = function(deployer) {
  deployer.deploy(SimpleStore);
};
