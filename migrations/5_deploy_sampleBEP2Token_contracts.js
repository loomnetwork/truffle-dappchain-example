// This is an example for how to deploy SampleBEP2Token
var SampleBEP2Token = artifacts.require("SampleBEP2Token");

let gatewayAddress = "" // dappchain gateway address according to deploying network

let name = "" // token name

let symbol = "" // token symbol

module.exports = function(deployer) {
  if (gatewayAddress === "" || name === "" || symbol === "") return
  deployer.deploy(SampleBEP2Token, gatewayAddress, name, symbol);
};