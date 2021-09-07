const { web3 } = require('@openzeppelin/test-environment');
const { BN, constants, expectEvent, expectRevert, send, ether } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const {upgrades} = require('hardhat');
const { expect } = require('chai');

let sfxContract;
let sfxWithSigned;

describe('WSFX', function () {
let deployer, minter, burner, other, deployerAddress, amount;

const name = 'Wrapped Safex Cash';
const symbol = 'WSFX';

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const MINTER_ROLE = web3.utils.soliditySha3('MINTER_ROLE');
const PAUSER_ROLE = web3.utils.soliditySha3('PAUSER_ROLE');

const ZERO = 0;

  beforeEach(async function () {
    amount = ethers.utils.parseEther('10');
    [ deployer, minter, burner, other ] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    WSFX = await ethers.getContractFactory("WSFX");
    sfxContract = await upgrades.deployProxy(WSFX, ["deposit-key", "deposit-address", "spend-key", "spend-address", "cold-key", "cold-address"], {initializer: 'initialize'});
    await sfxContract.deployed();
    sfxWithSigned = await sfxContract.connect(deployer);
  });

  describe('Setup', async function () {
    it('has correct keys initialized', async function () {
      expect(await sfxContract.sfxDepositViewKey()).to.equal("deposit-key");
      expect(await sfxContract.sfxDepositPublicAddress()).to.equal("deposit-address");
      expect(await sfxContract.sfxSpendViewKey()).to.equal("spend-key");
      expect(await sfxContract.sfxSpendPublicAddress()).to.equal("spend-address");
      expect(await sfxContract.sfxColdViewKey()).to.equal("cold-key");
      expect(await sfxContract.sfxColdPublicAddress()).to.equal("cold-address");
    });

    it('deployer can change sfx public addresses', async function () {
      await sfxContract.setDepositPublicAddress('new-deposit-address');
      expect(await sfxContract.sfxDepositPublicAddress()).to.equal('new-deposit-address');

      await sfxContract.setSpendPublicAddress('new-spend-address');
      expect(await sfxContract.sfxSpendPublicAddress()).to.equal('new-spend-address');

      await sfxContract.setColdPublicAddress('new-cold-address');
      expect(await sfxContract.sfxColdPublicAddress()).to.equal('new-cold-address');
    })

    it('deployer has the default admin role', async function () {
      const mc = await sfxContract.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
      expect(mc.toNumber()).to.equal(1);
      expect(await sfxContract.getRoleMember(DEFAULT_ADMIN_ROLE, 0)).to.equal(deployerAddress);
    });

    it('deployer has the pauser role', async function () {
      const mc = await sfxContract.getRoleMemberCount(PAUSER_ROLE);
      expect(mc.toNumber()).to.equal(1);
      expect(await sfxContract.getRoleMember(PAUSER_ROLE, 0)).to.equal(deployerAddress);
    });

    it('pauser is the default admin', async function () {
      expect(await sfxContract.getRoleAdmin(PAUSER_ROLE)).to.equal(DEFAULT_ADMIN_ROLE);
    });
  });

  // Check Fallback function
  describe('fallback()', async function () {
    it('should revert when sending ether to contract address', async function () {
        await expectRevert.unspecified(deployer.sendTransaction({to: sfxContract.address, value: ethers.utils.parseEther('1')}));
    });
  });

  describe('sfxContract metadata', function () {
    it('has a name', async () => {
        expect(await sfxContract.name()).to.equal(name);
    })
    it('has a symbol', async () => {
        expect(await sfxContract.symbol()).to.equal(symbol);
    })
  });

  describe('mint()', function () {
    beforeEach(async () => {
      await sfxWithSigned.addMinter(deployerAddress);
    });

    it('deployer can mint tokens', async function () {
      const trx = await sfxWithSigned.mint(deployerAddress, amount);
      const receipt = await trx.wait();
      expect(await sfxContract.balanceOf(deployerAddress)).to.be.equal(amount);
    });

    it('should emit the appropriate event when WSFX is minted', async () => {
      const trx = await sfxWithSigned.mint(deployerAddress, amount);
      const receipt = await trx.wait();
      await expect(sfxWithSigned.mint(deployerAddress, amount)).to.emit(sfxWithSigned, 'Minted');
      await expect(sfxWithSigned.mint(deployerAddress, amount)).to.emit(sfxWithSigned, 'Transfer');
    });

    it('should revert when amount is less than zero', async function () {
      await expectRevert(sfxWithSigned.mint(deployerAddress, ZERO),'WSFX: amount is zero');
    });

    it('other accounts cannot mint tokens', async function () {
      await expectRevert(sfxContract.connect(other).mint(deployerAddress, amount),'Caller is not a minter');
    });
  });

  describe('burn()', async () => {
      beforeEach(async () => {
        await sfxWithSigned.mint(deployerAddress, amount);
      });

      it('WSFX deployer should be able to burn WSFX', async () => {
        await sfxWithSigned.burn(amount);
        const balance = await sfxContract.balanceOf(deployerAddress);
        expect(balance.toNumber()).to.equal(0);
      });

      it('should emit the appropriate event when WSFX is burned', async () => {
        const trx = sfxWithSigned.burn(amount);
        await expect(trx).to.emit(sfxContract, 'Burned').withArgs(deployerAddress, amount);
        await expect(trx).to.emit(sfxContract, 'Transfer').withArgs(deployerAddress, ZERO_ADDRESS, amount);
      });

      it('should revert when amount is less than zero', async function () {
        await expectRevert(sfxWithSigned.burn(ZERO),'WSFX: amount is zero');
      });

      it('other accounts cannot burn tokens', async function () {
        await expectRevert(sfxContract.connect(other).burn(amount), 'Caller is not a burner');
      });
  })

  describe("addMinter()", async () => {
      it("default admin should be able to add a new minter", async () => {
        await sfxWithSigned.addMinter(await minter.getAddress());
        expect(await sfxContract.getRoleMember(MINTER_ROLE, 1)).to.equal(await minter.getAddress());
      })

      it("should emit the appropriate event when a new minter is added", async () => {
        const trx = sfxWithSigned.addMinter(await minter.getAddress());
        await expect(trx).to.emit(sfxWithSigned, "RoleGranted").withArgs(MINTER_ROLE, await minter.getAddress(), deployerAddress)
      })

      it("should revert when account is set to zero address", async () => {
        await expectRevert(sfxWithSigned.addMinter(ZERO_ADDRESS), 'Account is the zero address');
      })

      it("other address should not be able to add a new minter", async () => {
        await expectRevert(sfxContract.connect(other).addMinter(await minter.getAddress()), 'Caller is not the proxy');
      })
  })

  describe("removeMinter()", async () => {
      beforeEach(async () => {
        await sfxWithSigned.addMinter(await minter.getAddress());
      })

      it("default admin should be able to remove a minter", async () => {
        await sfxWithSigned.removeMinter(await minter.getAddress());
        expect(await sfxWithSigned.hasRole(MINTER_ROLE, await minter.getAddress())).to.equal(false);
      })

      it("should emit the appropriate event when a minter is removed", async () => {
        const trx = sfxWithSigned.removeMinter(await minter.getAddress());
        await expect(trx).to.emit(sfxWithSigned, "RoleRevoked").withArgs(MINTER_ROLE, await minter.getAddress(), deployerAddress);
      })

      it("other address should not be able to remove a minter", async () => {
        await expectRevert(sfxContract.connect(other).removeMinter(await minter.getAddress()), 'Caller is not the proxy');
      })
  })

  describe('pausing', function () {
      it('owner can pause', async function () {
        const trx = sfxWithSigned.pause();
        await expect(trx).to.emit(sfxWithSigned, 'Paused').withArgs(deployerAddress);

        expect(await sfxWithSigned.paused()).to.equal(true);
      });

      it('owner can unpause', async function () {
        await sfxWithSigned.pause();

        const trx = sfxWithSigned.unpause();
        await expect(trx).to.emit(sfxWithSigned, 'Unpaused').withArgs(deployerAddress);

        expect(await sfxWithSigned.paused()).to.equal(false);
      });

      it('cannot mint while paused', async function () {
        await sfxWithSigned.addMinter(deployerAddress);
        await sfxWithSigned.pause();

        await expectRevert(
          sfxWithSigned.mint(await other.getAddress(), amount),
          'Token transfer while paused'
        );
      });

      it('cannot transfer while paused', async function () {
        await sfxWithSigned.addMinter(deployerAddress);
        await sfxWithSigned.mint(deployerAddress, amount);
        await sfxWithSigned.pause();

        await expectRevert(
          sfxWithSigned.transfer(await other.getAddress(), amount),
          'Token transfer while paused'
        );
      });

      it('cannot burn while paused', async function () {
        await sfxWithSigned.addMinter(deployerAddress);
        await sfxWithSigned.mint(deployerAddress, amount);
        await sfxWithSigned.pause();

        await expectRevert(
          sfxWithSigned.burn(amount),
          'Token transfer while paused'
        );
      });

      it('other accounts cannot pause', async function () {
        await expectRevert(sfxContract.connect(other).pause(), 'Must have pauser role to pause');
      });
  });

  // Check override _tranfer() function
  describe('ERC20 _beforeTokenTransfer hook', async function () {
      beforeEach(async function () {
        await sfxWithSigned.addMinter(deployerAddress);
        await sfxWithSigned.mint(deployerAddress, amount);
      });

      it('check mint() for revert when trying to mint to the token contract', async function () {
        await expectRevert(sfxWithSigned.mint(sfxContract.address, amount), 'Transfer to the token contract');
      });

      it('check transfer() for revert when trying to transfer to the token contract', async function () {
        await expectRevert(sfxWithSigned.transfer(sfxContract.address, amount), 'Transfer to the token contract');
      });

      it('check transferFrom() for revert when trying to transfer to the token contract', async function () {
        await sfxWithSigned.increaseAllowance(sfxContract.address, amount);
        await expectRevert(sfxWithSigned.transferFrom(deployerAddress, sfxContract.address, amount), 'Transfer to the token contract');
      });
  });
});
