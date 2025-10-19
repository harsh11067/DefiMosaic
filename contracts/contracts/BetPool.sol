// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * BetPool (ERC1155): compact hackathon demo
 * - Supports native (MATIC) deposit via depositNative()
 * - Supports ERC20 deposit via depositERC20()
 * - Mints ERC1155 token id = 1 as 'shares' where 1 wei of token => 1 share (use same decimals concept in tests)
 * - Users can lock shares (safeTransferFrom) to create ChildBet with leverage provided by contract liquidity
 * - resolvePool reads price from AggregatorV3Interface (mock in tests)
 *
 * NOTE: This is a **demo skeleton**. Do NOT use in production without audits.
 */

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./interfaces/AggregatorV3Interface.sol";

contract BetPool is ERC1155, Ownable, ERC1155Holder {
    // --- constants & state
    uint256 public constant SHARE_ID = 1;

    IERC20 public erc20Token; // optional ERC20 payment token (if zero address, ERC20 functions disabled)
    AggregatorV3Interface public priceFeed;
    uint256 public priceTarget;
    uint256 public deadline;

    bool public resolved;
    bool public finalOutcome;

    uint256 public totalShares;
    uint256 public totalDeposited; // in native units (wei for MATIC) or ERC20 units

    struct ChildBet {
        address creator;
        uint256 parentSharesLocked;
        uint256 stakeAmount; // stake + loan included
        uint256 leverageBPS;
        bool resolved;
        bool outcome;
    }
    ChildBet[] public childBets;

    // events
    event DepositNative(address indexed who, uint256 amount, uint256 sharesMinted);
    event DepositERC20(address indexed who, uint256 amount, uint256 sharesMinted);
    event ChildBetCreated(address indexed creator, uint256 childId, uint256 parentSharesLocked, uint256 stake, uint256 leverageBPS);
    event PoolResolved(bool outcome);
    event Claimed(address indexed who, uint256 amount);

    /**
     * @param _erc20Token address of ERC20 (use zero address if none)
     * @param _priceFeed Chainlink (or mock) aggregator address
     * @param _priceTarget target price in aggregator units
     * @param _deadline unix timestamp after which pool can be resolved
     * @param _owner initial owner of the pool (owner/keeper who can call resolvePool)
     */
    constructor(
        address _erc20Token,
        address _priceFeed,
        uint256 _priceTarget,
        uint256 _deadline,
        address _owner
    ) ERC1155("") Ownable(_owner) {
        erc20Token = IERC20(_erc20Token);
        priceFeed = AggregatorV3Interface(_priceFeed);
        priceTarget = _priceTarget;
        deadline = _deadline;
        resolved = false;
        finalOutcome = false;
    }

    
    // --- Deposit native MATIC. Mint 1:1 shares for amount (demo)
    function depositNative() external payable {
        require(!resolved, "resolved");
        require(block.timestamp < deadline, "deadline passed");
        require(msg.value > 0, "zero");

        uint256 sharesToMint = msg.value; // 1 wei -> 1 share in demo
        totalDeposited += msg.value;
        totalShares += sharesToMint;
        _mint(msg.sender, SHARE_ID, sharesToMint, "");

        emit DepositNative(msg.sender, msg.value, sharesToMint);
    }


    // --- Deposit ERC20 (if contract constructed with ERC20 address)
    function depositERC20(uint256 amount) external {
        require(!resolved, "resolved");
        require(block.timestamp < deadline, "deadline passed");
        require(amount > 0, "zero");
        require(address(erc20Token) != address(0), "no ERC20 configured");

        bool ok = erc20Token.transferFrom(msg.sender, address(this), amount);
        require(ok, "transferFrom failed");

        uint256 sharesToMint = amount;
        totalDeposited += amount;
        totalShares += sharesToMint;
        _mint(msg.sender, SHARE_ID, sharesToMint, "");

        emit DepositERC20(msg.sender, amount, sharesToMint);
    }

    // --- Create child bet: user must have shares and must have approved this contract for ERC1155 transfers
    function createChildBet(uint256 parentSharesToLock, uint256 stakeAmountERC20, uint256 leverageBPS) external {
        require(!resolved, "resolved");
        require(block.timestamp < deadline, "deadline passed");
        require(parentSharesToLock > 0, "need collateral");
        require(leverageBPS <= 8000, "max 80%");

        // transfer parent shares (user must setApprovalForAll)
        safeTransferFrom(msg.sender, address(this), SHARE_ID, parentSharesToLock, "");
        totalShares -= parentSharesToLock;

        // collect stake ERC20 if amount > 0
        if (stakeAmountERC20 > 0) {
            require(address(erc20Token) != address(0), "ERC20 not set");
            bool ok = erc20Token.transferFrom(msg.sender, address(this), stakeAmountERC20);
            require(ok, "stake transfer failed");
            totalDeposited += stakeAmountERC20;
        }

        // issue loan = parentSharesToLock * leverageBPS / 10000 (demo uses shares==units)
        uint256 loan = (parentSharesToLock * leverageBPS) / 10000;
        // require contract has native balance or ERC20 balance to cover loan — here we assume native pool exists
        require(address(this).balance >= loan, "insufficient native liquidity for loan (fund contract first)");

        // book loan: we don't mint separate funds, just increase deposited for accounting
        totalDeposited += loan;

        childBets.push(ChildBet({
            creator: msg.sender,
            parentSharesLocked: parentSharesToLock,
            stakeAmount: stakeAmountERC20 + loan,
            leverageBPS: leverageBPS,
            resolved: false,
            outcome: false
        }));

        uint256 childId = childBets.length - 1;
        emit ChildBetCreated(msg.sender, childId, parentSharesToLock, stakeAmountERC20 + loan, leverageBPS);
    }

    // --- Resolve: owner/keeper calls after deadline
    function resolvePool() external onlyOwner {
        require(!resolved, "already resolved");
        require(block.timestamp >= deadline, "too early");

        (, int256 answer, , uint256 updatedAt, ) = priceFeed.latestRoundData();
        require(updatedAt > 0, "invalid oracle");
        uint256 latestPrice = uint256(answer);

        bool outcome = latestPrice >= priceTarget;
        resolved = true;
        finalOutcome = outcome;

        // mark child bets as resolved - simple mapping
        for (uint256 i = 0; i < childBets.length; i++) {
            childBets[i].resolved = true;
            childBets[i].outcome = outcome;
        }

        emit PoolResolved(outcome);
    }

    // --- Claim: burn user's shares and pay out
    // Demo payout: if finalOutcome == true => payout = amount * 2, else payout = amount / 2
    function claim(uint256 amount) external {
        require(resolved, "not resolved");
        require(amount > 0, "zero");
        uint256 bal = balanceOf(msg.sender, SHARE_ID);
        require(bal >= amount, "not enough shares");

        // burn shares
        _burn(msg.sender, SHARE_ID, amount);

        uint256 payout;
        if (finalOutcome) {
            payout = amount * 2;
        } else {
            payout = amount / 2;
        }

        // Prefer native payout; if contract ETH insufficient, try ERC20
        if (address(this).balance >= payout) {
            (bool sent,) = payable(msg.sender).call{value: payout}("");
            require(sent, "native transfer failed");
            emit Claimed(msg.sender, payout);
            return;
        }

        // fallback to ERC20 if configured and balance available
        if (address(erc20Token) != address(0) && erc20Token.balanceOf(address(this)) >= payout) {
            bool ok = erc20Token.transfer(msg.sender, payout);
            require(ok, "erc20 payout failed");
            emit Claimed(msg.sender, payout);
            return;
        }

        revert("insufficient contract funds for payout");
    }

    // utility: view child count
    function childCount() external view returns (uint256) {
        return childBets.length;
    }

    // Allow contract to receive native MATIC
    receive() external payable {
        // Allow receiving native MATIC for funding the pool
    }

    // Override required functions for ERC1155Holder
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC1155Holder) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
