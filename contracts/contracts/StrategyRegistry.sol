// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title StrategyRegistry
 * @notice Registry for social copy trading strategies
 * - Users can create strategies
 * - Followers can follow strategies
 * - Strategy creators can charge fees
 * - Leaderboard for best performers
 */
import "@openzeppelin/contracts/access/Ownable.sol";

contract StrategyRegistry is Ownable {
    struct Strategy {
        uint256 id;
        address creator;
        string name;
        string description;
        uint256 feeBPS; // Fee in basis points (e.g., 200 = 2%)
        uint256 totalFollowers;
        uint256 totalValueLocked;
        uint256 totalGains; // Total gains in USD (or native token)
        uint256 todayGains; // Gains today
        bool active;
        uint256 createdAt;
    }
    
    struct Follower {
        address user;
        uint256 amountInvested;
        uint256 shares;
        uint256 joinedAt;
    }
    
    mapping(uint256 => Strategy) public strategies;
    mapping(uint256 => Follower[]) public strategyFollowers;
    mapping(address => uint256[]) public userStrategies; // Strategies created by user
    mapping(address => uint256[]) public userFollowedStrategies; // Strategies user follows
    mapping(address => mapping(uint256 => bool)) public isFollowing; // user => strategyId => isFollowing
    
    uint256 public strategyIdCounter;
    uint256 public constant MAX_FEE_BPS = 2000; // 20% max fee
    
    // Events
    event StrategyCreated(
        uint256 indexed strategyId,
        address indexed creator,
        string name,
        uint256 feeBPS
    );
    event StrategyFollowed(
        uint256 indexed strategyId,
        address indexed follower,
        uint256 amount
    );
    event StrategyUnfollowed(
        uint256 indexed strategyId,
        address indexed follower
    );
    event GainsUpdated(
        uint256 indexed strategyId,
        uint256 totalGains,
        uint256 todayGains
    );
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Create a new trading strategy
     */
    function createStrategy(
        string memory name,
        string memory description,
        uint256 feeBPS
    ) external returns (uint256) {
        require(feeBPS <= MAX_FEE_BPS, "fee too high");
        require(bytes(name).length > 0, "name required");
        
        strategyIdCounter++;
        uint256 id = strategyIdCounter;
        
        strategies[id] = Strategy({
            id: id,
            creator: msg.sender,
            name: name,
            description: description,
            feeBPS: feeBPS,
            totalFollowers: 0,
            totalValueLocked: 0,
            totalGains: 0,
            todayGains: 0,
            active: true,
            createdAt: block.timestamp
        });
        
        userStrategies[msg.sender].push(id);
        
        emit StrategyCreated(id, msg.sender, name, feeBPS);
        return id;
    }
    
    /**
     * @notice Follow a strategy
     */
    function followStrategy(uint256 strategyId) external payable {
        Strategy storage strategy = strategies[strategyId];
        require(strategy.id != 0, "strategy not found");
        require(strategy.active, "strategy inactive");
        require(!isFollowing[msg.sender][strategyId], "already following");
        require(msg.value > 0, "zero amount");
        
        strategyFollowers[strategyId].push(Follower({
            user: msg.sender,
            amountInvested: msg.value,
            shares: msg.value, // 1:1 for simplicity
            joinedAt: block.timestamp
        }));
        
        strategy.totalFollowers++;
        strategy.totalValueLocked += msg.value;
        isFollowing[msg.sender][strategyId] = true;
        userFollowedStrategies[msg.sender].push(strategyId);
        
        emit StrategyFollowed(strategyId, msg.sender, msg.value);
    }
    
    /**
     * @notice Unfollow a strategy
     */
    function unfollowStrategy(uint256 strategyId) external {
        require(isFollowing[msg.sender][strategyId], "not following");
        
        Strategy storage strategy = strategies[strategyId];
        
        // Find and remove follower
        Follower[] storage followers = strategyFollowers[strategyId];
        for (uint256 i = 0; i < followers.length; i++) {
            if (followers[i].user == msg.sender) {
                strategy.totalValueLocked -= followers[i].amountInvested;
                followers[i] = followers[followers.length - 1];
                followers.pop();
                break;
            }
        }
        
        strategy.totalFollowers--;
        isFollowing[msg.sender][strategyId] = false;
        
        // Remove from user's followed list
        uint256[] storage followed = userFollowedStrategies[msg.sender];
        for (uint256 i = 0; i < followed.length; i++) {
            if (followed[i] == strategyId) {
                followed[i] = followed[followed.length - 1];
                followed.pop();
                break;
            }
        }
        
        emit StrategyUnfollowed(strategyId, msg.sender);
    }
    
    /**
     * @notice Update strategy gains (called by strategy vault or external)
     */
    function updateGains(uint256 strategyId, uint256 gains, bool isToday) external {
        Strategy storage strategy = strategies[strategyId];
        require(strategy.id != 0, "strategy not found");
        // In production, add access control here
        
        strategy.totalGains += gains;
        if (isToday) {
            strategy.todayGains += gains;
        }
        
        emit GainsUpdated(strategyId, strategy.totalGains, strategy.todayGains);
    }
    
    /**
     * @notice Get top strategies by today's gains
     */
    function getTopStrategies(uint256 limit) external view returns (uint256[] memory, uint256[] memory) {
        uint256[] memory topIds = new uint256[](limit);
        uint256[] memory topGains = new uint256[](limit);
        
        // Simple O(n) selection - in production use better algorithm
        for (uint256 i = 1; i <= strategyIdCounter; i++) {
            if (!strategies[i].active) continue;
            
            uint256 gains = strategies[i].todayGains;
            for (uint256 j = 0; j < limit; j++) {
                if (gains > topGains[j]) {
                    // Shift array
                    for (uint256 k = limit - 1; k > j; k--) {
                        topIds[k] = topIds[k - 1];
                        topGains[k] = topGains[k - 1];
                    }
                    topIds[j] = i;
                    topGains[j] = gains;
                    break;
                }
            }
        }
        
        return (topIds, topGains);
    }
    
    /**
     * @notice Get user's created strategies
     */
    function getUserStrategies(address user) external view returns (uint256[] memory) {
        return userStrategies[user];
    }
    
    /**
     * @notice Get user's followed strategies
     */
    function getUserFollowedStrategies(address user) external view returns (uint256[] memory) {
        return userFollowedStrategies[user];
    }
    
    /**
     * @notice Get strategy followers
     */
    function getStrategyFollowers(uint256 strategyId) external view returns (Follower[] memory) {
        return strategyFollowers[strategyId];
    }
    
    receive() external payable {
        // Allow receiving native MATIC
    }
}
