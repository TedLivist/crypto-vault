const { ethers } = require("hardhat");

async function main() {
      const Vault = await ethers.getContractFactory('Vault');
      // 4 owners, 3 required confirmations and
      // 24 hours (86400 seconds) cooldown for tx executions
      const vault = await Vault.deploy([
        "0x867cB5ef14903D336b0bDFc570b03D136d457aCc",
        "0xe1827DC13548CAAF9c346590592423FE77101b14",
        "0x094EFB4f1BB93af54B79b917802951a722C8a567",
        "0xba3c2Fbed22A0689b5B03a1650351e64604117aC"
      ], 3, 86400);

      await vault.waitForDeployment();
      const vaultAddress = await vault.getAddress();
      console.log(vaultAddress);
}

main()
  .catch(console.error);