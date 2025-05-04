const { loadFixture }  = require("@nomicfoundation/hardhat-network-helpers")
const { assert, expect } = require("chai")

describe('Vault', () => {
  async function deployContractAndVariables() {
    const [deployer, firstUser, secondUser, thirdUser] = await ethers.getSigners();

    const deployerAddress = await deployer.getAddress()
    const firstUserAddress = await firstUser.getAddress()
    const secondUserAddress = await secondUser.getAddress()
    const thirdUserAddress = await thirdUser.getAddress()

    const Vault = await ethers.getContractFactory('Vault');
    const vault = await Vault.deploy([deployerAddress, firstUserAddress, secondUserAddress, thirdUserAddress], 3)
  
    return { vault, deployerAddress, firstUserAddress, secondUserAddress, thirdUserAddress }
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
})