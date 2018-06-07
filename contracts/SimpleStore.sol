pragma solidity ^0.4.22;

contract SimpleStore {
  uint value;

  event NewValueSet(uint _value, address _sender);

  function set(uint _value) public {
    value = _value;
    emit NewValueSet(value, msg.sender);
  }

  function get() public view returns (uint, address) {
    return (value, msg.sender);
  }
}
