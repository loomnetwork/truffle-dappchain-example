pragma solidity 0.4.24;

import './BEP2TokenTemplate.sol';

contract SampleBEP2Token is BEP2TokenTemplate {
    constructor(address _gateway, string _name, string _symbol) BEP2TokenTemplate(_gateway, _name, _symbol) public {
    }

}
