pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract MyRinkebyCoin is ERC20 {
    string public name = "MyRinkebyCoin";
    string public symbol = "MRC";
    uint8 public decimals = 18;

    // one billion in initial supply
    uint256 public constant INITIAL_SUPPLY = 1000000000;

    constructor () public {
        uint256 totalSupply = INITIAL_SUPPLY * (10 ** uint256(decimals));
        _mint(msg.sender, totalSupply);
    }
}
