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

  before(async () => {
    // before() is run only once at the start of the contract
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
    let ethValue = 1;
    let ethPrice = 500;

    it("mints stablecoins for the sender", async () => {
      const mint = await instance.mintStablecoin({
        from: accounts[0],
        value: ether(ethValue)
      });

      // gas used: 105845
      // console.log("Gas used (mintStablecoin): " + mint.receipt.gasUsed);

      expectEvent(mint, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: accounts[0],
        value: ether(ethValue*ethPrice)
      });

      const collateralAmount = await instance.getCollateralAmount(accounts[0]);
      assert.equal(collateralAmount, ether(ethValue));

      const debtAmount = await instance.getDebtAmount(accounts[0]);
      assert.equal(debtAmount, ether(ethValue*ethPrice));

      const stablecoinBalance = await instance.balanceOf(accounts[0]);
      assert.equal(stablecoinBalance, ether(ethValue*ethPrice));
    });

    it("mints stablecoins for another beneficiary", async () => {
      // account 0 mints stablecoin for account 1
      const mint = await instance.mintStablecoinFor(accounts[1], {
        from: accounts[0],
        value: ether(ethValue)
      });

      // gas used: 106249
      // console.log("Gas used (mintStablecoinFor): " + mint.receipt.gasUsed);

      expectEvent(mint, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: accounts[1],
        value: ether(ethValue*ethPrice)
      });

      const collateralAmount = await instance.getCollateralAmount(accounts[1]);
      assert.equal(collateralAmount, ether(ethValue));

      const debtAmount = await instance.getDebtAmount(accounts[1]);
      assert.equal(debtAmount, ether(ethValue*ethPrice));

      const stablecoinBalance = await instance.balanceOf(accounts[1]);
      assert.equal(stablecoinBalance, ether(ethValue*ethPrice));
    });

    it("partly burns stablecoins", async () => {
      const ethBalanceBefore = await web3.eth.getBalance(accounts[0]);

      const stablecoinBalanceBefore = await instance.balanceOf(accounts[0]);
      assert.equal(stablecoinBalanceBefore, ether(500));

      let stablecoinsToBurn = ether(167);
      
      const burn = await instance.burnStablecoin(stablecoinsToBurn);

      // gas used: 51354
      // console.log("Gas used (burnStablecoin): " + burn.receipt.gasUsed);

      expectEvent(burn, "Transfer", {
        from: accounts[0],
        to: constants.ZERO_ADDRESS,
        value: stablecoinsToBurn
      });

      const collateralAmount = await instance.getCollateralAmount(accounts[0]);
      assert.equal(collateralAmount, ether(0.67));

      const debtAmount = await instance.getDebtAmount(accounts[0]);
      assert.equal(debtAmount, ether(ethValue*ethPrice)-stablecoinsToBurn);

      const stablecoinBalanceAfter = await instance.balanceOf(accounts[0]);
      assert.equal(stablecoinBalanceAfter, ether(ethValue*ethPrice)-stablecoinsToBurn);

      const ethBalanceAfter = await web3.eth.getBalance(accounts[0]);
      assert.isTrue(ethBalanceBefore < ethBalanceAfter);
    });

    it("burns all the rest of the account 0's stablecoins", async () => {
      const ethBalanceBefore = await web3.eth.getBalance(accounts[0]);

      const stablecoinBalanceBefore = await instance.balanceOf(accounts[0]);
      assert.equal(stablecoinBalanceBefore, ether(333));

      let stablecoinsToBurn = ether(333);
      
      const burn = await instance.burnStablecoin(stablecoinsToBurn);

      // gas used: 51354
      // console.log("Gas used (burnStablecoin): " + burn.receipt.gasUsed);

      expectEvent(burn, "Transfer", {
        from: accounts[0],
        to: constants.ZERO_ADDRESS,
        value: stablecoinsToBurn
      });

      const collateralAmount = await instance.getCollateralAmount(accounts[0]);
      assert.equal(collateralAmount, 0);

      const debtAmount = await instance.getDebtAmount(accounts[0]);
      assert.equal(debtAmount, 0);

      const stablecoinBalanceAfter = await instance.balanceOf(accounts[0]);
      assert.equal(stablecoinBalanceAfter, 0);

      const ethBalanceAfter = await web3.eth.getBalance(accounts[0]);
      assert.isTrue(ethBalanceBefore < ethBalanceAfter);
    });

    it("allows account 0 to burn stablecoins to benefit another user", async () => {
      // account 0 needs to mint some frEUR because it doesn't have any right now
      const mint = await instance.mintStablecoin({
        from: accounts[0],
        value: ether(0.5)
      });

      const ethBalanceSenderBefore = await web3.eth.getBalance(accounts[0]);

      const ethBalanceBeneficiaryBefore = await web3.eth.getBalance(accounts[1]);

      const stablecoinBalanceBefore = await instance.balanceOf(accounts[1]);
      assert.equal(stablecoinBalanceBefore, ether(500));

      let stablecoinsToBurn = ether(167);
      
      // account 0 burns their stablecoin to benefit account 1
      const burn = await instance.burnStablecoinFor(stablecoinsToBurn, accounts[1]);

      // gas used: 86257
      // console.log("Gas used (burnStablecoinFor): " + burn.receipt.gasUsed);

      expectEvent(burn, "Transfer", {
        from: accounts[1],
        to: constants.ZERO_ADDRESS,
        value: stablecoinsToBurn
      });

      const collateralAmount = await instance.getCollateralAmount(accounts[1]);
      assert.equal(collateralAmount, ether(0.67));

      const debtAmount = await instance.getDebtAmount(accounts[1]);
      assert.equal(debtAmount, ether(ethValue*ethPrice)-stablecoinsToBurn);

      const stablecoinBalanceAfter = await instance.balanceOf(accounts[1]);
      assert.equal(stablecoinBalanceAfter, ether(ethValue*ethPrice)-stablecoinsToBurn);

      let burnFee = ether(0.0033);

      // sender's ETH balance should go up by the burnFee amount (minus the tx fee) because sender is contract owner
      const ethBalanceSenderAfter = await web3.eth.getBalance(accounts[0]);
      assert.approximately(
        Number(ethBalanceSenderAfter-ethBalanceSenderBefore), 
        Number(burnFee),
        Number(ether(0.0008)) // error of margin due to gas fee
      );

      // the beneficiary's ETH balance goes up for the unlocked collateral minus the burn fee
      const ethBalanceBeneficiaryAfter = await web3.eth.getBalance(accounts[1]);
      assert.approximately(
        Number(ethBalanceBeneficiaryAfter-ethBalanceBeneficiaryBefore), 
        Number(ether(0.33)-burnFee),
        Number(82000) // error of margin due to dust
      );
    });

    xit("burn but send an amount bigger than balance", async () => {});
    xit("burn, but balance 0", async () => {});
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