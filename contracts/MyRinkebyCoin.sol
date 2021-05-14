pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract MyRinkebyCoin is ERC20 {
    // one billion in initial supply
    uint256 public constant INITIAL_SUPPLY = 1000000000;

    constructor () public ERC20("MyRinkebyCoin", "MRC") {
        uint256 totalSupply = 10000000000000000000000;
        _mint(msg.sender, totalSupply);
    }
}
