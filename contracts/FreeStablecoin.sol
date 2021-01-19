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
    _mintStablecoin(msg.value, _msgSender());
    return true;
  }

  function mintStablecoinFor(address beneficiary) payable public returns(bool) {
    _mintStablecoin(msg.value, beneficiary);
    return true;
  }

  function burnStablecoin(uint stablecoinAmount) public returns(bool) {
    _burnStablecoin(stablecoinAmount, _msgSender());
    return true;
  }
  
  function burnStablecoinFor(uint stablecoinAmount, address beneficiary) public returns(bool) {
    _burnStablecoin(stablecoinAmount, beneficiary);
    return true;
  }

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

  function _burnStablecoin(uint _stablecoinAmount, address _beneficiary) internal {
    require(_stablecoinAmount > 0);
    require(_beneficiary != address(0));

    // check if msg.sender has enough stablecoins
    uint senderBalance = balanceOf(_msgSender());

    if (senderBalance == 0) {
      revert("Sender's token balance is 0."); // if msg.sender has 0 stablecoins, revert
    } else if (senderBalance < _stablecoinAmount) {
      _stablecoinAmount = senderBalance; // balance is less than specified amount, reduce the _stablecoinAmount
    }

    // calculate the percentage of burned stablecoins in debt: (_stablecoinAmount / debt) * collateral
    uint ratio = (_stablecoinAmount.mul(100)).div(getDebtAmount(_beneficiary));
    uint ethUnlocked = (ratio.mul(getCollateralAmount(_beneficiary))).div(100);

    // calculate the burn fee and reduce the amount of ETH to be returned
    uint burnFee = ethUnlocked.mul(burnFeePercentage).div(100);

    // stablecoin burn
    _burn(_beneficiary, _stablecoinAmount);

    // reduce the collateral and stablecoin amounts in Vault
    vaults[_beneficiary].ethLocked = vaults[_beneficiary].ethLocked.sub(ethUnlocked);
    vaults[_beneficiary].stablecoinsMinted = vaults[_beneficiary].stablecoinsMinted.sub(_stablecoinAmount);

    // send the burn fee in ETH to the owner/governance address
    payable(owner()).transfer(burnFee);

    // return the unlocked ETH to beneficiary (minus the burn fee)
    payable(_beneficiary).transfer(ethUnlocked.sub(burnFee));
  }

  // GOVERNANCE

  // function changeBurnFeePercentage() public onlyOwner returns(bool) {}

  // function changeOracleAddress() public onlyOwner returns(bool) {}

  // RECEIVE & FALLBACK
  receive() external payable { 
    _mintStablecoin(msg.value, _msgSender());
  }

  fallback() external payable {
    _mintStablecoin(msg.value, _msgSender());
  }

}
