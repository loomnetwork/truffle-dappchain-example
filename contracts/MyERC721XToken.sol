pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "erc721x/contracts/Core/ERC721X/ERC721XToken.sol";

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

    function mintTokens(address _to, uint256 _tokenId, uint256 _amount) external {
        require(msg.sender == ownerOf(_tokenId));
        uint256 supply = balanceOf(_to, _tokenId);
        _mint(_tokenId, _to, supply.add(_amount));
    }

    // fungible mint
    function mint(uint256 _tokenId, address _to, uint256 _supply) external {
        _mint(_tokenId, _to, _supply);
    }

    // nft mint
    function mint(uint256 _tokenId, address _to) external {
        _mint(_tokenId, _to);
    }

    // Mints the requested amount of the given fungible token type, and transfers ownership to the Gateway
    function mintToGateway(uint256 _tokenId, uint256 _amount) public
    {
        require(msg.sender == gateway, "Only the Gateway can mint new tokens");
        uint256 supply = balanceOf(gateway, _tokenId);
        _mint(_tokenId, gateway, supply.add(_amount));
    }

    function mintToGateway(uint256 _uid) public
    {
        require(msg.sender == gateway, "only the gateway is allowed to mint");
        _mint(_uid, gateway);
    }

    function depositToGatewayNFT(uint256 _tokenId) public {
        safeTransferFrom(msg.sender, gateway, _tokenId);
    }

    function depositToGatewayFT(uint256 _tokenId, uint256 amount) public {
        safeTransferFrom(msg.sender, gateway, _tokenId, amount);
    }

    // This is a workaround for go-ethereum's abigen not being able to handle function overloads.
    function balanceOfToken(address _owner, uint256 _tokenId) public view returns (uint256) {
        return balanceOf(_owner, _tokenId);
    }
}
