// This is an example for how to deploy SampleBEP2Token
var SampleBEP2Token = artifacts.require("SampleBEP2Token");

let gatewayAddress = ""

let name = ""

let symbol = ""

module.exports = function(deployer) {
  deployer.deploy(SampleBEP2Token, gatewayAddress, name, symbol);
};