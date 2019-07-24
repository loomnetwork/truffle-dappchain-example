pragma solidity ^0.4.24;

import 'openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol';

contract BEP2TokenTemplate is MintableToken {
    mapping (address => bool) gateway;
    string public name;
    string public symbol;
    uint8 public constant decimals = 8; // Need to have exact 8 decimals because of BEP2 specifications
    uint256 public INITIAL_SUPPLY = 0 * (10 ** uint256(decimals));
    mapping (address => bool) validator;

    constructor(address _gateway, string _name, string _symbol) public {
        gateway[_gateway] = true;
        validator[msg.sender] = true;
        totalSupply_ = INITIAL_SUPPLY;
        balances[msg.sender] = INITIAL_SUPPLY;
        name = _name;
        symbol = _symbol;
    }

    function mintToGateway(uint256 _amount) onlyGateway public {
        totalSupply_ = totalSupply_.add(_amount);
        balances[msg.sender] = balances[msg.sender].add(_amount);
        emit Mint(msg.sender, _amount);
        emit Transfer(address(0), msg.sender, _amount);
    }

    // Overloaded `mint` function of Mintable token for onlyValidator
    function mint(address _to, uint256 _amount) onlyValidator canMint public returns (bool) {
        totalSupply_ = totalSupply_.add(_amount);
        balances[_to] = balances[_to].add(_amount);
        emit Mint(_to, _amount);
        emit Transfer(address(0), _to, _amount);
        return true;
    }

    function addValidator(address newValidator) onlyValidator public {
        validator[newValidator] = true;
    }

    modifier onlyValidator() {
        require(validator[msg.sender] == true, "not authorized to perform this action");
        _;
    }

    modifier onlyGateway(){
        require(gateway[msg.sender] == true, "only gateways are allowed mint");
        _;
    }

    function addGateway(address _gateway) onlyValidator public {
        gateway[_gateway] = true;
    }

    function removeGateway(address _gateway) onlyValidator public {
        gateway[_gateway] = false;
    }

}
