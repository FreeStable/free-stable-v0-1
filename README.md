# FreeStable v0.1 - Stablecoin Research

> WIP - Work In Progress

This repository hosts an experiment implementation of a FreeStable stablecoin. The test uses a EUR-pegged version (FreeEUR), but it can be used for any currency.

**Features:**

- Collateralized with **ETH only**
- A **burning fee** instead of an interest rate
- Collateral **lock** instead of liquidations
- Simple design to reduce the potential attack/bug surface

Note that the amount of locked collateral **does not decrease** with the collateral price increasing (as it is the case with Synthetix minting). But you can unlock a percentage of the collateral by repaying the same percentage of your debt.

## Potential design changes

### Delayed liquidations

A new field can be added to the Vault: `lastDebtRepayment` (timestamp). The first time this is added is when the Vault was created (although it **probably** shouldn't be updated with future mints, unless the Vault was empty before). 

So the timestamp should be added under one of two conditions:

- The previous debt value was 0.
- The user has burned some stablecoin (reduced debt).

If the user hasn't reduced their debt for over a certain period of time (for example over 2 years), then s/he can be liquidated.

### Minting ratio bigger than 1

In this example, the minted stablecoin value is the same as the collateral value (1:1). It needs to be researched whether this may be a subject of an economic attack (especially if the burning fee is set to 0).

In case this presents a problem, a minting ratio bigger than 1 could be introduced (maybe 1.1).

### Last known price

The `FreeStablecoin` contract could have a variable called `lastKnownPrice` to be used in case `OracleBroker` fails to return a price.

### Multi-oracle

The OracleBroker should get price feeds from different sources. 

How to calculate the final price? 

Pick the lowest price (which gives you the least amount of stablecoins for your ETH), because this one is the safest to use (even though it may be well below the market price - in this case is like having a minting ratio above 1, so no big deal).

## FAQ

### Why aren't liquidations possible? Wouldn't that hurt the peg?

The peg holds if people who are buying/selling the stablecoin believe that the peg is real. The experience with stablecoins so far has shown that (see USDT).

Besides the common belief into the peg, the basic supply & demand also affect the peg. Even if a person believes that a FreeEUR stablecoin should be worth 1 EUR, they might pay more for it if there's too little supply on the market.

Hence there's a need for a mechanism that motivates minters to mint stablecoins in times of a bigger demand. One mechanism is completely natural - a higher market price. But there's also another mechanism - increasing the burn fee, which would discourage minters from reducing the stablecoin supply.

A potential additional mechanism could be rewarding minters with governance tokens.

## TODO

- OracleBroker contract
- update the getEthPrice() method
- change `burnFeePercentage` to `burnFeeBps` (basis points, 1 = 0.01%). This would allow to have smaller burn fee increases/decreases.
- front-end implementation
- testnet deployment (Vercel?)
