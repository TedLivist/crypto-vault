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
    
      deployer, secondUser, fourthUser, thirdUser
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

  describe("Existing transactions", function() {
    let vault, deployer, fourthUserAddress,
        fourthUser, secondUser, txID,
        thirdUser
    
    
    beforeEach(async function() {
      let fixture = await loadFixture(deployContractAndVariables);
      
      vault = fixture.vault;
      deployer = fixture.deployer;
      fourthUser = fixture.fourthUser;
      fourthUserAddress = fixture.fourthUserAddress;
      secondUser = fixture.secondUser;
      thirdUser = fixture.thirdUser;
      
      const transferAmount = ethers.parseEther("0.5");
      const createTx = await vault.connect(deployer).createTransaction(fourthUserAddress, transferAmount, "0x");
      await createTx.wait();

      txID = Number(await vault.getTransactionsCount()) - 1
    });

    it("confirms the transaction", async function() {
      const confirmTx = await vault.connect(secondUser).confirmTransaction(txID);
      await confirmTx.wait();
      
      const tx = await vault.transactions(txID);
      expect(Number(await tx.confirmations)).to.equal(2);
    })

    it("returns transaction confirmation count", async function() {
      const tx1 = await vault.connect(secondUser).confirmTransaction(txID);
      await tx1.wait();
      
      const tx2 = await vault.connect(thirdUser).confirmTransaction(txID);
      await tx2.wait();

      const count = await vault.confirmationsCount(txID);
      expect(Number(count)).to.equal(3);
    })

    it("checks if transaction has met the required confirmations", async function() {
      const tx1 = await vault.connect(secondUser).confirmTransaction(txID);
      await tx1.wait();

      expect(await vault.checkConfirmation(txID)).to.equal(false);

      const tx2 = await vault.connect(thirdUser).confirmTransaction(txID);
      await tx2.wait();

      expect(await vault.checkConfirmation(txID)).to.equal(true);
    })
  })
})