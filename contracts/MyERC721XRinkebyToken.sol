pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "erc721x/contracts/Core/ERC721X/ERC721XToken.sol";


contract MyERC721XRinkebyToken is ERC721XToken {
    using SafeMath for uint256;

    address owner;
    address public gateway;

    function name() external view returns (string) {
        return "ERC721XCards";
    }

    function symbol() external view returns (string) {
        return "XCRD";
    }

    constructor (address _gateway) public {
        owner = msg.sender;
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

    function depositToGatewayNFT(address _gateway, uint256 _tokenId) public {
        //require(tokenType[_tokenId] == NFT, "You are not transferring a  NFT");
        safeTransferFrom(msg.sender, _gateway, _tokenId);
    }

    function depositToGateway(address _gateway, uint256 _tokenId, uint256 amount) public {
        //require(tokenType[_tokenId] == FT, "You are not transferring a  FT");
        safeTransferFrom(msg.sender, _gateway, _tokenId, amount);
    }

    // This is a workaround for go-ethereum's abigen not being able to handle function overloads.
    function balanceOfToken(address _owner, uint256 _tokenId) public view returns (uint256) {
        return balanceOf(_owner, _tokenId);
    }
}
