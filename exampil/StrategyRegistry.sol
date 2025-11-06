// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract StrategyRegistry is Ownable {
    struct Strategy {
        address owner;
        address vault; // StrategyVault address
        string metadataURI; // JSON metadata (description, tags, fee model etc.)
        uint256 followers;
        bool active;
    }

    mapping(uint256 => Strategy) public strategies;
    uint256 public nextId;

    event StrategyCreated(uint256 id, address owner, address vault, string uri);
    event StrategyUpdated(uint256 id, string uri);
    event Followed(uint256 id, address follower);
    event Unfollowed(uint256 id, address follower);

    function createStrategy(address vault, string calldata uri) external returns (uint256) {
        uint256 id = nextId++;
        strategies[id] = Strategy(msg.sender, vault, uri, 0, true);
        emit StrategyCreated(id, msg.sender, vault, uri);
        return id;
    }

    function updateURI(uint256 id, string calldata uri) external {
        require(msg.sender == strategies[id].owner, "not owner");
        strategies[id].metadataURI = uri;
        emit StrategyUpdated(id, uri);
    }

    // follow/unfollow increments are emitted by backend or vault on deposit/withdraw to avoid sybil
    function incFollowers(uint256 id) external {
        require(msg.sender == strategies[id].vault, "only vault");
        strategies[id].followers++;
        emit Followed(id, msg.sender);
    }
    function decFollowers(uint256 id) external {
        require(msg.sender == strategies[id].vault, "only vault");
        strategies[id].followers--;
        emit Unfollowed(id, msg.sender);
    }
}
