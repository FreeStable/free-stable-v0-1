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

  const governance = accounts[0];
  const sender = accounts[1];
  const beneficiary = accounts[2];

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
        from: sender,
        value: ether(ethValue)
      });

      // gas used: 105845
      // console.log("Gas used (mintStablecoin): " + mint.receipt.gasUsed);

      expectEvent(mint, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: sender,
        value: ether(ethValue*ethPrice)
      });

      const collateralAmount = await instance.getCollateralAmount(sender);
      assert.equal(collateralAmount, ether(ethValue));

      const debtAmount = await instance.getDebtAmount(sender);
      assert.equal(debtAmount, ether(ethValue*ethPrice));

      const stablecoinBalance = await instance.balanceOf(sender);
      assert.equal(stablecoinBalance, ether(ethValue*ethPrice));
    });

    it("mints stablecoins for another account (beneficiary)", async () => {
      // sender mints stablecoin for beneficiary
      const mint = await instance.mintStablecoinFor(beneficiary, {
        from: sender,
        value: ether(ethValue)
      });

      // gas used: 106249
      // console.log("Gas used (mintStablecoinFor): " + mint.receipt.gasUsed);

      expectEvent(mint, "Transfer", {
        from: constants.ZERO_ADDRESS,
        to: beneficiary,
        value: ether(ethValue*ethPrice)
      });

      // the collateral should be in the name of the beneficiary
      const collateralAmount = await instance.getCollateralAmount(beneficiary);
      assert.equal(collateralAmount, ether(ethValue));

      // the debt should be in the name of the beneficiary
      const debtAmount = await instance.getDebtAmount(beneficiary);
      assert.equal(debtAmount, ether(ethValue*ethPrice));

      const stablecoinBalance = await instance.balanceOf(beneficiary);
      assert.equal(stablecoinBalance, ether(ethValue*ethPrice));
    });

    it("partly burns stablecoins", async () => {
      // sender decides to burn some stablecoins and reduce their own debt

      const ethBalanceSenderBefore = await web3.eth.getBalance(sender);
      const ethBalanceGovernanceBefore = await web3.eth.getBalance(governance);

      const collateralAmountBefore = await instance.getCollateralAmount(sender);
      assert.equal(collateralAmountBefore, ether(1));

      const stablecoinBalanceBefore = await instance.balanceOf(sender);
      assert.equal(stablecoinBalanceBefore, ether(500));

      let stablecoinsToBurn = ether(167);
      
      const burn = await instance.burnStablecoin(stablecoinsToBurn, {
        from: sender
      });

      // gas used: 51354
      // console.log("Gas used (burnStablecoin): " + burn.receipt.gasUsed);

      expectEvent(burn, "Transfer", {
        from: sender,
        to: constants.ZERO_ADDRESS,
        value: stablecoinsToBurn
      });

      // the collateral for sender has been reduced from 1 ETH to 0.67 ETH
      const collateralAmountAfter = await instance.getCollateralAmount(sender);
      assert.equal(collateralAmountAfter, ether(0.67));

      const debtAmount = await instance.getDebtAmount(sender);
      assert.equal(debtAmount, ether(ethValue*ethPrice)-stablecoinsToBurn);

      const stablecoinBalanceAfter = await instance.balanceOf(sender);
      assert.equal(stablecoinBalanceAfter, ether(ethValue*ethPrice)-stablecoinsToBurn);

      // sender's ETH balance is now bigger because sender got part of the collateral back (a bit less than 0.33 ETH)
      const ethBalanceSenderAfter = await web3.eth.getBalance(sender);
      assert.approximately(
        Number(ethBalanceSenderAfter)-Number(ethBalanceSenderBefore),
        Number(collateralAmountBefore)-Number(collateralAmountAfter),
        Number(ether(0.01)) // the difference are both the burn fee & gas fee
      );

      // the governance earned approx. 0.0033 ETH as the burn fee
      const ethBalanceGovernanceAfter = await web3.eth.getBalance(governance);
      const burnFeePercentage = await instance.getBurnPercentage();
      const collateralUnlocked = Number(collateralAmountBefore)-Number(collateralAmountAfter);
      const burnFeeTotal = collateralUnlocked*(burnFeePercentage/100);
      assert.approximately(
        Number(ethBalanceGovernanceAfter)-Number(ethBalanceGovernanceBefore), 
        Number(burnFeeTotal),
        Number(1000000));
    });

    it("burns all the rest of the sender's stablecoins", async () => {
      const ethBalanceBefore = await web3.eth.getBalance(sender);

      const stablecoinBalanceBefore = await instance.balanceOf(sender);
      assert.equal(stablecoinBalanceBefore, ether(333));

      let stablecoinsToBurn = ether(333);
      
      const burn = await instance.burnStablecoin(stablecoinsToBurn, {
        from: sender
      });

      // gas used: 51354
      // console.log("Gas used (burnStablecoin): " + burn.receipt.gasUsed);

      expectEvent(burn, "Transfer", {
        from: sender,
        to: constants.ZERO_ADDRESS,
        value: stablecoinsToBurn
      });

      const collateralAmount = await instance.getCollateralAmount(sender);
      assert.equal(collateralAmount, 0);

      const debtAmount = await instance.getDebtAmount(sender);
      assert.equal(debtAmount, 0);

      const stablecoinBalanceAfter = await instance.balanceOf(sender);
      assert.equal(stablecoinBalanceAfter, 0);

      const ethBalanceAfter = await web3.eth.getBalance(sender);
      assert.isTrue(ethBalanceBefore < ethBalanceAfter);
    });

    it("allows sender to burn stablecoins to benefit another user (beneficiary)", async () => {
      // sender needs to mint some frEUR because it doesn't have any right now
      const mint = await instance.mintStablecoin({
        from: sender,
        value: ether(0.5)
      });

      const ethBalanceSenderBefore = await web3.eth.getBalance(sender);

      const ethBalanceBeneficiaryBefore = await web3.eth.getBalance(beneficiary);

      const stablecoinBalanceBefore0 = await instance.balanceOf(sender);
      //console.log(Number(stablecoinBalanceBefore0));
      assert.equal(stablecoinBalanceBefore0, ether(250));

      const stablecoinBalanceBefore1 = await instance.balanceOf(beneficiary);
      assert.equal(stablecoinBalanceBefore1, ether(500));

      let stablecoinsToBurn = ether(167);
      
      // account 0 burns their stablecoin to benefit account 1
      const burn = await instance.burnStablecoinFor(stablecoinsToBurn, beneficiary, {
        from: sender
      });

      // gas used: 86257
      // console.log("Gas used (burnStablecoinFor): " + burn.receipt.gasUsed);

      expectEvent(burn, "Transfer", {
        from: sender,
        to: constants.ZERO_ADDRESS,
        value: stablecoinsToBurn
      });

      const collateralAmount = await instance.getCollateralAmount(beneficiary);
      assert.equal(collateralAmount, ether(0.67));

      const debtAmount = await instance.getDebtAmount(beneficiary);
      assert.equal(debtAmount, ether(ethValue*ethPrice)-stablecoinsToBurn);

      // stablecoin balance of the person that burned the tokens (sender)
      const stablecoinBalanceAfter0 = await instance.balanceOf(sender);
      assert.equal(stablecoinBalanceAfter0, ether(250)-stablecoinsToBurn);

      let burnFee = ether(0.0033);

      // sender's ETH balance should go down
      const ethBalanceSenderAfter = await web3.eth.getBalance(sender);
      assert.isTrue(ethBalanceSenderAfter < ethBalanceSenderBefore);

      // the beneficiary's ETH balance goes up for the unlocked collateral minus the burn fee
      const ethBalanceBeneficiaryAfter = await web3.eth.getBalance(beneficiary);
      assert.approximately(
        Number(ethBalanceBeneficiaryAfter-ethBalanceBeneficiaryBefore), 
        Number(ether(0.33)-burnFee),
        Number(82000) // error of margin due to dust
      );
    });

    it("doesn't burn as much as sender wanted due to lower actual frEUR balance", async () => {
      // sender attempts to reduce debt of the beneficiary
      // the problem is that sender has less frEUR tokens than sent
      const stablecoinBalanceBefore = await instance.balanceOf(sender);
      assert.equal(stablecoinBalanceBefore, ether(83)); // sender has 83 frEUR

      let stablecoinsToBurn = ether(222); // tries to burn more stablecoin than it has (222 vs. 83)

      const debtAmountBefore = await instance.getDebtAmount(beneficiary);
      assert.equal(debtAmountBefore, ether(333));
      
      // sender burns their stablecoin to benefit beneficiary
      const burn = await instance.burnStablecoinFor(stablecoinsToBurn, beneficiary, {
        from: sender
      });

      expectEvent(burn, "Transfer", {
        from: sender,
        to: constants.ZERO_ADDRESS,
        value: ether(83) // the actual burn should be 83 frEUR, not 222 frEUR
      });

      const debtAmountAfter = await instance.getDebtAmount(beneficiary);
      assert.equal(debtAmountAfter, ether(250));
    });

    it("fails at burning because sender's frEUR balance is 0", async () => {
      // sender attempts to reduce debt of the beneficiary
      // the problem is that sender does not have any frEUR tokens
      const stablecoinBalanceBefore = await instance.balanceOf(sender);
      assert.equal(stablecoinBalanceBefore, 0);

      const debtAmount = ether(250);

      const debtAmountBefore = await instance.getDebtAmount(beneficiary);

      const collateralAmountBefore = await instance.getCollateralAmount(beneficiary);

      // the tx should fail because account 0's frEUR balance is 0
      await expectRevert(
        instance.burnStablecoinFor(debtAmount, beneficiary, {from: sender}), // trying to burn 250 frEUR debt
        "Sender's token balance is 0."
      );

      // the beneficiary's debt & collateral amounts should have stayed the same
      const debtAmountAfter = await instance.getDebtAmount(beneficiary);
      assert.equal(Number(debtAmountAfter), Number(debtAmountBefore));

      const collateralAmountAfter = await instance.getCollateralAmount(beneficiary);
      assert.equal(Number(collateralAmountAfter), Number(collateralAmountBefore));

    });
    
    it("burns less than specified amount of stablecoin due to debt being lower than that", async () => {
      // Beneficiary will burn the whole debt, but will send a bigger amount of stablecoin than really needed.
      // Because sender was burning frEUR for beneficiary, the beneficiary actually holds more frEUR than his debt is.
      const debtAmountBefore = await instance.getDebtAmount(beneficiary); // 250 frEUR
      assert.equal(debtAmountBefore, ether(250));

      const stablecoinBalanceBefore = await instance.balanceOf(beneficiary); // 500 frEUR
      assert.equal(stablecoinBalanceBefore, ether(500));

      const ethBalanceBefore = await web3.eth.getBalance(beneficiary);
      
      const burn = await instance.burnStablecoin(ether(500), { // try to burn 500 frEUR
        from: beneficiary
      });

      // gas used: 39564
      // console.log("Gas used (burnStablecoin): " + burn.receipt.gasUsed);

      expectEvent(burn, "Transfer", {
        from: beneficiary,
        to: constants.ZERO_ADDRESS,
        value: ether(250) // the real amount of burned tokens should be 250 frEUR (not 500)
      });

      const debtAmountAfter = await instance.getDebtAmount(beneficiary);
      assert.equal(debtAmountAfter, 0); // all debt is repaid

      const collateralAmount = await instance.getCollateralAmount(beneficiary);
      assert.equal(collateralAmount, 0); // all collateral is returned (minus the burn fee)

      const stablecoinBalanceAfter = await instance.balanceOf(beneficiary);
      assert.equal(stablecoinBalanceAfter, ether(250));

      const ethBalanceAfter = await web3.eth.getBalance(beneficiary);
      assert.isTrue(ethBalanceBefore < ethBalanceAfter);
    });
  });

  describe("Governance", () => {
    xit("", async () => {});
    xit("", async () => {});
    xit("", async () => {});
    xit("", async () => {});
    xit("", async () => {});
  });

});