// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StrategyVault is ERC20, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant STRATEGIST_ROLE = keccak256("STRATEGIST_ROLE");
    IERC20 public depositToken; // e.g., USDC or zero-address for native (we'll show ERC20 example)
    address public registry;
    uint256 public performanceFeeBPS; // e.g., 2000 = 20%
    uint256 public highWaterMark; // track last high share price

    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdraw(address indexed user, uint256 shares, uint256 amount);
    event StrategistTrade(address indexed caller, address target, bytes data);

    constructor(
        address _depositToken,
        address _strategist,
        address _registry,
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        depositToken = IERC20(_depositToken);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(STRATEGIST_ROLE, _strategist);
        registry = _registry;
    }

    // deposit USDC -> mint shares based on total assets
    function deposit(uint256 amount) external {
        require(amount > 0, "zero");
        uint256 totalAssetsBefore = _totalAssets();
        depositToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 shares;
        if (totalSupply() == 0 || totalAssetsBefore == 0) {
            shares = amount;
        } else {
            shares = (amount * totalSupply()) / totalAssetsBefore;
        }
        _mint(msg.sender, shares);
        // notify registry (increment follower)
        StrategyRegistry(registry).incFollowers(/* pass id? keep mapping externally or vault stores id */ 0);
        emit Deposit(msg.sender, amount, shares);
    }

    // strategist executes a trade/call using funds in this vault
    function strategistCall(address target, bytes calldata data) external onlyRole(STRATEGIST_ROLE) {
        (bool ok, ) = target.call(data);
        require(ok, "strategy call failed");
        emit StrategistTrade(msg.sender, target, data);
    }

    function withdraw(uint256 shares) external {
        require(shares > 0, "zero");
        uint256 totalAssets = _totalAssets();
        uint256 amount = (shares * totalAssets) / totalSupply();
        _burn(msg.sender, shares);

        // compute performance fee if applicable: simplistic: fee on profit from HWM
        // For hackathon keep simple: no fee on initial MVP, add later
        depositToken.safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, shares, amount);
    }

    function _totalAssets() public view returns (uint256) {
        return depositToken.balanceOf(address(this));
    }
}
