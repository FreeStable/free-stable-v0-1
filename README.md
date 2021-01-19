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

### Minting ratio bigger than 1

In this example, the minted stablecoin value is the same as the collateral value (1:1). It needs to be researched whether this may be a subject of an economic attack (especially if the burning fee is set to 0).

In case this presents a problem, a minting ratio bigger than 1 could be introduced (maybe 1.1).

### Last known price

The `FreeStablecoin` contract could have a variable called `lastKnownPrice` to be used in case `OracleBroker` fails to return a price.

### Multi-oracle

The OracleBroker should get price feeds from different sources. 

How to calculate the final price? 

Pick the lowest price (which gives you the least amount of stablecoins for your ETH), because this one is the safest to use (even though it may be well below the market price - in this case is like having a minting ratio above 1, so no big deal).

## TODO

- OracleBroker contract
- update the getEthPrice() method
- change `burnFeePercentage` to `burnFeePercentageCents` (in this case 1% would be 100). This would allow to have smaller burn fee increases/decreases.
- front-end implementation
- testnet deployment (Vercel?)
