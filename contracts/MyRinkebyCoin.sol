pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/AddressUtils.sol";
import "./ERC20Receiver.sol";

contract MyRinkebyCoin is StandardToken {
    using AddressUtils for address;

    string public name = "MyRinkebyCoin";
    string public symbol = "MRC";
    uint8 public decimals = 18;

    // one billion in initial supply
    uint256 public constant INITIAL_SUPPLY = 1000000000;

    bytes4 constant ERC20_RECEIVED = 0xbc04f0af;

    constructor() public {
        totalSupply_ = INITIAL_SUPPLY * (10 ** uint256(decimals));
        balances[msg.sender] = totalSupply_;
    }

    function safeTransferAndCall(address _to, uint256 _amount) public {
        transfer(_to, _amount);
        require(
            checkAndCallSafeTransfer(msg.sender, _to, _amount),
            "Sent to a contract which is not an ERC20 receiver"
        );
    }

    function checkAndCallSafeTransfer(
        address _from, address _to, uint256 _amount
    ) internal returns (bool) {
        if (!_to.isContract()) {
            return true;
        }

        bytes4 retval = ERC20Receiver(_to).onERC20Received(_from, _amount);
        return (retval == ERC20_RECEIVED);
    }
}
