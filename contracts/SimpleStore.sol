pragma solidity ^0.8.0;

contract SimpleStore {
  uint256 value;

  event NewValueSet(uint256 indexed _value, address _sender);
  event NewValueSetAgain(uint256 indexed _value, address _sender);

  function set(uint256 _value) public {
    value = _value;
    emit NewValueSet(value, msg.sender);
  }

  function setAgain(uint256 _value) public {
    value = _value;
    emit NewValueSetAgain(value, msg.sender);
  }

  function get() public view returns (uint256, address) {
    return (value, msg.sender);
  }
}
