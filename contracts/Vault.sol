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
  uint public getTransactionsCount;
  
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
    require(isOwner[msg.sender] == true, "Only owners can perform this function");
    _;
  }

  function createTransaction(address _to, uint _txValue, bytes calldata _data) public onlyOwner returns(uint) {
    require(address(this).balance > _txValue, "Insufficient balance!");

    transactions.push();
    uint txIndex = transactions.length - 1;
    
    Transaction storage transaction = transactions[txIndex];
    transaction.to = _to;
    transaction.txValue = _txValue;
    transaction.executed = false;
    transaction.data = _data;
    transaction.ownerConfirmed[msg.sender] = true;
    transaction.confirmations++;

    getTransactionsCount++;

    return txIndex;
  }

  function confirmTransaction(uint txID) public onlyOwner returns(bool) {
    Transaction storage transaction = transactions[txID];
    
    if(transaction.ownerConfirmed[msg.sender] == false) {
      transaction.ownerConfirmed[msg.sender] = true;
      transaction.confirmations++;
    }

    return true;
  }

  function confirmationsCount(uint txID) public view returns(uint) {
    Transaction storage transaction = transactions[txID];
    uint txConfirmationsCount = transaction.confirmations;

    return txConfirmationsCount;
  }

  function checkConfirmation(uint txID) public view returns(bool) {
    bool check = confirmationsCount(txID) >= requiredConfirmations;

    return check;
  }

  function executeTransaction(uint txID) public onlyOwner {
    require(checkConfirmation(txID) == true, "Only completely confirmed transactions can be executed");

    Transaction storage transaction = transactions[txID];
    require(address(this).balance > transaction.txValue, "Insufficient balance");

    (bool s, ) = address(transaction.to).call{ value: transaction.txValue }(transaction.data);
    require(s);

    transaction.executed = true;
  }

  receive() external payable {}
}