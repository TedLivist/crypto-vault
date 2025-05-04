// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "hardhat/console.sol";

// this is a multisig vault contract
contract Vault {

  struct Transaction {
    address to;
    uint256 txValue;
    bool executed;
    bytes data;
    uint256 confirmations;
    mapping(address => bool) ownerConfirmed;
  }

  address[] public owners;
  mapping(address => bool) public isOwner;
  
  uint256 public requiredConfirmations;

  Transaction[] public transactions;
  
  constructor(address[] memory _owners, uint256 _requiredConfirmations) {
    require(_owners.length > 0, "Owners are required");
    for(uint i = 0; i < _owners.length; i++) {
      require(_owners[i] == address(_owners[i]), "Invalid address for owner");
      require(!isOwner[_owners[i]], "Duplicate owner");

      owners.push(_owners[i]);
      isOwner[_owners[i]] = true;
    }

    require(_requiredConfirmations > 0 &&
            _requiredConfirmations <= _owners.length, "Invalid required confirmations");
    
    requiredConfirmations = _requiredConfirmations;
  }

  modifier onlyOwner() {
    require(isOwner[msg.sender] == true);
    _;
  }
 
}