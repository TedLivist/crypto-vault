const { loadFixture }  = require("@nomicfoundation/hardhat-network-helpers")
const { assert, expect } = require("chai");
const { ethers } = require("hardhat");

describe('Vault', () => {
  async function deployContractAndVariables() {
    const [deployer, firstUser, secondUser, thirdUser, fourthUser] = await ethers.getSigners();

    const deployerAddress = await deployer.getAddress();
    const firstUserAddress = await firstUser.getAddress();
    const secondUserAddress = await secondUser.getAddress();
    const thirdUserAddress = await thirdUser.getAddress();
    const fourthUserAddress = await fourthUser.getAddress();

    const Vault = await ethers.getContractFactory('Vault');
    const vault = await Vault.deploy([deployerAddress, firstUserAddress, secondUserAddress, thirdUserAddress], 3)
  
    return { vault, deployerAddress,
      firstUserAddress, secondUserAddress,
      thirdUserAddress, fourthUserAddress,
    
      deployer, fourthUser
    }
  }

  it("sets the variables", async function () {
    const { vault, deployerAddress, firstUserAddress, secondUserAddress, thirdUserAddress } = await loadFixture(deployContractAndVariables)

    // ensure initial owners are added to owners array
    expect(await vault.owners(0)).to.equal(deployerAddress);
    expect(await vault.owners(1)).to.equal(firstUserAddress);
    expect(await vault.owners(2)).to.equal(secondUserAddress);
    expect(await vault.owners(3)).to.equal(thirdUserAddress);

    // ensure each owner is mapped to an isOwner variable
    expect(await vault.isOwner(deployerAddress)).to.equal(true);
    expect(await vault.isOwner(firstUserAddress)).to.equal(true);
    expect(await vault.isOwner(secondUserAddress)).to.equal(true);
    expect(await vault.isOwner(thirdUserAddress)).to.equal(true);

    // ensure the required confirmations are well defined
    expect(Number(await vault.requiredConfirmations())).to.equal(3);
  })

  it("creates the transaction", async function() {
    const { vault, fourthUserAddress, deployer, fourthUser } = await loadFixture(deployContractAndVariables);
    const transferAmount = ethers.parseEther("0.5");
    
    const createTx = await vault.connect(deployer).createTransaction(fourthUserAddress, transferAmount, "0x");
    await createTx.wait();
    const txCount = Number(await vault.getTransactionsCount());
    const tx = await vault.transactions(txCount - 1);
    
    // test that the transaction is created
    // and the 'to' address is correct
    expect(tx[0]).to.equal(fourthUserAddress);
    expect(txCount).to.equal(1);
    
    // assert that only owners can create a transaction
    try {
      await vault.connect(fourthUser).createTransaction(fourthUserAddress, transferAmount, "0x");
      assert.fail("Transaction should have reverted");
    } catch (error) {
      expect(error.message).to.include("Only owners can perform this function");
    }
  })
})