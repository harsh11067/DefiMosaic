// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./BetPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BetPoolFactory is Ownable {
    address[] public allPools;
    constructor() Ownable(msg.sender) {} // 👈 set deployer as owner
    event PoolCreated(address indexed poolAddr, address indexed creator);
    
    function createPoolWithNative(
        uint256 durationSeconds,
        address priceFeed,
        uint256 priceTarget
    ) external payable returns (address) {
        require(msg.value > 0, "Need POL value");
        
        uint256 deadline = block.timestamp + durationSeconds;
        BetPool pool = new BetPool(
            address(0), // No ERC20 token for native-only pools
            priceFeed,
            priceTarget,
            deadline,
            msg.sender
        );
        
        allPools.push(address(pool));

        // fund new pool with MATIC
        (bool sent, ) = payable(address(pool)).call{value: msg.value}("");
        require(sent, "Funding failed");

        emit PoolCreated(address(pool), msg.sender);
        return address(pool);
    }

    // create pool with optional ERC20 token (set erc20Token = address(0) to only accept native deposits)
    function createPool(
        address erc20Token,            // address(0) allowed
        address priceFeed,
        uint256 priceTarget,
        uint256 deadline
    ) external returns (address) {
        BetPool pool = new BetPool(erc20Token, priceFeed, priceTarget, deadline, msg.sender);
        allPools.push(address(pool));
        emit PoolCreated(address(pool), msg.sender);
        return address(pool);
    }

    function getAllPools() external view returns (address[] memory) {
        return allPools;
    }
}
