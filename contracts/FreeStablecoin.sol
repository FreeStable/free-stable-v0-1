// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import "@openzeppelin/contracts/math/SafeMath.sol";

contract FreeStablecoin is ERC20, Ownable {
  using SafeMath for uint256;

  // VARIABLES
  address private oracle;
  uint private burnFeePercentage = 1; // 1% by default

  // DATA STRUCTURES
  struct Vault { // each minter has a vault that tracks the amount of ETH locked and stablecoin minted
    uint ethLocked; // collateral
    uint stablecoinsMinted; // debt
  }

  mapping (address => Vault) private vaults;

  // EVENTS
  
  // CONSTRUCTOR
  constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

  // VIEW
  function getCollateralAmount(address minter) public view returns(uint) {
    return vaults[minter].ethLocked;
  }

  function getDebtAmount(address minter) public view returns(uint) {
    return vaults[minter].stablecoinsMinted;
  }

  function getBurnPercentage() public view returns(uint) {
    return burnFeePercentage;
  }

  // PUBLIC (state changing)
  function mintStablecoin() payable public returns(bool) {
    _mintStablecoin(msg.value, msg.sender);
    return true;
  }

  function mintStablecoinFor(address beneficiary) payable public returns(bool) {
    _mintStablecoin(msg.value, beneficiary);
    return true;
  }

  // function burnStablecoin() public returns(bool) {}
  
  // function burnStablecoinFor(address beneficiary) public returns(bool) {}

  function getEthPrice() public returns(uint) {
    // gets current ETH price from an oracle
    // hardcoded for this experiment only
    return 500; // 1 ETH = 500 stablecoins
  }

  // INTERNAL
  function _mintStablecoin(uint _ethAmount, address _beneficiary) internal {
    require(_ethAmount > 0);
    require(_beneficiary != address(0));

    uint stablecoinAmount = _ethAmount.mul(getEthPrice());
    _mint(_beneficiary, stablecoinAmount);
    vaults[_beneficiary] = Vault(_ethAmount, stablecoinAmount);
  }

  // function _burnStablecoin(uint ethAmount, address beneficiary) internal {}
    // burn fee should be taken in ETH (not in the stablecoin!)
    // prevent burn if collateralization ratio below threshold

  // GOVERNANCE

  // function changeBurnFeePercentage() public onlyOwner returns(bool) {}

  // function changeOracleAddress() public onlyOwner returns(bool) {}

  // RECEIVE & FALLBACK
  receive() external payable { 
    _mintStablecoin(msg.value, msg.sender);
  }

  fallback() external payable {
    _mintStablecoin(msg.value, msg.sender);
  }

}
