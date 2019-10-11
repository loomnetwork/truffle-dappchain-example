pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";

contract MyToken is ERC721Full {
    // Transfer Gateway contract address
    address public gateway;

    constructor (address _gateway) ERC721Full("MyToken", "MTC") public {
        gateway = _gateway;
    }

    // Used by the DAppChain Gateway to mint tokens that have been deposited to the Ethereum Gateway
    function mintToGateway (uint256 _uid) public
    {
        require(msg.sender == gateway, "only the gateway is allowed to mint");
        _mint(gateway, _uid);
    }
}
