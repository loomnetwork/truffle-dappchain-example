pragma solidity ^0.4.22;

contract SimpleStore {
  uint256 value;

  event NewValueSet(uint256 indexed _value, address _sender);

  function set(uint256 _value) public {
    value = _value;
    emit NewValueSet(value, msg.sender);
  }

  function get() public view returns (uint256, address) {
    return (value, msg.sender);
  }
}
