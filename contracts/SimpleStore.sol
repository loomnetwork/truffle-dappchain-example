pragma solidity ^0.4.22;

contract SimpleStore {
  uint value;

  event NewValueSet(uint _value);

  function set(uint _value) public {
    value = _value;
    emit NewValueSet(value);
  }

  function get() public view returns (uint) {
    return value;
  }
}
