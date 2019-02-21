pragma solidity ^0.4.24;

import "erc721x/contracts/Core/ERC721X/ERC721XToken.sol";
import "erc721x/contracts/Libraries/ObjectsLib.sol";

contract MyERC721XToken is ERC721XToken {
    using SafeMath for uint256;

    // Transfer Gateway contract address
    address public gateway;

    function name() external view returns (string) {
        return "ERC721XCards";
    }

    function symbol() external view returns (string) {
        return "XCRD";
    }

    /**
     * @dev Constructor function
     */
    constructor(address _gateway) public {
        gateway = _gateway;
    }

    // Mints the requested amount of the given fungible token type, and transfers ownership to the Gateway
    function mintToGateway(uint256 _tokenId, uint256 _amount) public
    {
        require(msg.sender == gateway, "Only the Gateway can mint new tokens");
        uint256 supply = balanceOf(gateway, _tokenId);
        _mint(_tokenId, gateway, supply.add(_amount));
    }

    // This is a workaround for go-ethereum's abigen not being able to handle function overloads.
    function balanceOfToken(address _owner, uint256 _tokenId) public view returns (uint256) {
        return balanceOf(_owner, _tokenId);
    }
}
