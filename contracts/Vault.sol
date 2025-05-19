// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

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

  uint public withdrawalDelay;
  uint public lastWithdrawal = block.timestamp;

  bool private locked;

  event TransactionCreated(address indexed sender, uint256 txIndex);
  event TransactionConfirmed(address indexed sender);
  event TransactionExecuted(address indexed sender, address indexed to, uint256 value);
  
  constructor(address[] memory _owners, uint256 _requiredConfirmations, uint256 _withdrawalDelay) {
    require(_owners.length > 0, "Owners are required");
    for(uint i = 0; i < _owners.length; i++) {
      require(_owners[i] != address(0), "Invalid address for owner");
      require(!isOwner[_owners[i]], "Duplicate owner");

      owners.push(_owners[i]);
      isOwner[_owners[i]] = true;
    }

    require(_requiredConfirmations > 0 &&
            _requiredConfirmations <= _owners.length, "Invalid required confirmations");
    
    requiredConfirmations = _requiredConfirmations;
    withdrawalDelay = _withdrawalDelay;
  }

  modifier onlyOwner() {
    require(isOwner[msg.sender] == true, "Only owners can perform this function");
    _;
  }

  modifier noReentrancy() {
    require(!locked, "Reentrancy call!");
    locked = true;
    _;
    locked = false;
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

    emit TransactionCreated(msg.sender, txIndex);

    return txIndex;
  }

  function confirmTransaction(uint txID) public onlyOwner returns(bool) {
    require(txID < transactions.length, "Transaction does not exist");
    Transaction storage transaction = transactions[txID];
    
    if(transaction.ownerConfirmed[msg.sender] == false) {
      transaction.ownerConfirmed[msg.sender] = true;
      transaction.confirmations++;
    }

    emit TransactionConfirmed(msg.sender);

    return true;
  }

  function confirmationsCount(uint txID) public view returns(uint) {
    require(txID < transactions.length, "Transaction does not exist");
    Transaction storage transaction = transactions[txID];
    uint txConfirmationsCount = transaction.confirmations;

    return txConfirmationsCount;
  }

  function checkConfirmation(uint txID) public view returns(bool) {
    require(txID < transactions.length, "Transaction does not exist");
    bool check = confirmationsCount(txID) >= requiredConfirmations;
    
    return check;
  }

  function executeTransaction(uint txID) public onlyOwner noReentrancy {
    require(txID < transactions.length, "Transaction does not exist");
    require(checkConfirmation(txID) == true, "Only completely confirmed transactions can be executed");
    require(block.timestamp >= (lastWithdrawal + withdrawalDelay), "Cooldown between withdrawals has not elapsed");

    Transaction storage transaction = transactions[txID];
    require(address(this).balance > transaction.txValue, "Insufficient balance");
    require(!transaction.executed, "Transaction has already been executed");

    transaction.executed = true;
    lastWithdrawal = block.timestamp;
    emit TransactionExecuted(msg.sender, transaction.to, transaction.txValue);
    (bool s, ) = address(transaction.to).call{ value: transaction.txValue }(transaction.data);
    require(s, "Transaction execution failed");
  }

  receive() external payable {}
}