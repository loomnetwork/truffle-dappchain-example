pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";

contract MyRinkebyToken is ERC721Full {
    constructor() ERC721Full("MyRinkebyToken", "MRT") public {
    }

    function mint(uint256 _uid) public
    {
        _mint(msg.sender, _uid);
    }

    // Convenience function to get around crappy function overload limitations in Web3
    function depositToGateway(address _gateway, uint256 _uid) public {
        safeTransferFrom(msg.sender, _gateway, _uid);
    }
}
