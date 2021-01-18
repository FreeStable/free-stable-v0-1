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

### Minting ratio bigger than 100%

In this example, the minted stablecoin value is the same as the collateral value (1:1, or 100% ratio). It needs to be researched whether this may be a subject of an economic attack (especially if the burning fee is set to 0).

In case this presents a problem, a minting ratio bigger than 100% could be introduced.

## TODO

- Burning methods & tests
- Governance methods & tests
