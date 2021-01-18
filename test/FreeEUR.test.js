const {
  BN,           // Big Number support 
  constants,    // Common constants, like the zero address and largest integers
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const { assert } = require("chai");

// helper
const ether = (n) => web3.utils.toWei(n.toString(), 'ether');

// artifacts
const FreeStablecoin = artifacts.require("FreeStablecoin");

contract("FreeStablecoin", accounts => {
  let instance;

  const name = "FreeEUR";
  const symbol = "frEUR";

  beforeEach(async () => {
    instance = await FreeStablecoin.new(name, symbol);
  });

  describe("Check basic ERC20 variables", () => {

    it("has the correct name (" + name + ")", async () => {
      const _name = await instance.name();
      assert.equal(_name, name);
    });

    it("has the correct symbol (" + symbol + ")", async () => {
      const _symbol = await instance.symbol();
      assert.equal(_symbol, symbol);
    });

    it("has 18 decimal places", async () => {
      const decimals = await instance.decimals();
      assert.equal(decimals, 18);
    });

    it("has 0 current total supply", async () => {
      const totalSupply = await instance.totalSupply();
      assert.equal(totalSupply, 0);
    });

  });

  describe("Minting and burning", () => {

    it("mints stablecoins for the sender", async () => {
      let ethValue = 1;
      let ethPrice = 500;

      const mint = await instance.mintStablecoin({
        from: accounts[0],
        value: ether(ethValue)
      });

      expectEvent(mint, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: accounts[0],
        value: ether(ethValue*ethPrice)
      });

      const collateralAmount = await instance.getCollateralAmount(accounts[0]);
      assert.equal(collateralAmount, ether(ethValue));

      const debtAmount = await instance.getDebtAmount(accounts[0]);
      assert.equal(debtAmount, ether(ethValue*ethPrice));
    });

    it("mints stablecoins for another beneficiary", async () => {
      let ethValue = 1;
      let ethPrice = 500;

      // account 0 mints stablecoin for account 1
      const mint = await instance.mintStablecoinFor(accounts[1], {
        from: accounts[0],
        value: ether(ethValue)
      });

      expectEvent(mint, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: accounts[1],
        value: ether(ethValue*ethPrice)
      });

      const collateralAmount = await instance.getCollateralAmount(accounts[1]);
      assert.equal(collateralAmount, ether(ethValue));

      const debtAmount = await instance.getDebtAmount(accounts[1]);
      assert.equal(debtAmount, ether(ethValue*ethPrice));
    });

    xit("", async () => {});
    xit("", async () => {});
    xit("", async () => {});
  });

  describe("Governance", () => {
    xit("", async () => {});
    xit("", async () => {});
    xit("", async () => {});
    xit("", async () => {});
    xit("", async () => {});
  });

});