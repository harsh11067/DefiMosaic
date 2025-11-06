// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {FullDike} from "../src/FullDike.sol";

/// @title Deploy FullDike on Polygon Amoy
/// @notice Deploys FullDike configured for POL as native token (no USDC needed)
contract DeployFullDikeScript is Script {
    FullDike public fullDike;

    // Polygon Amoy-specific config
    address public constant TREASURY_AMOY = 0xc2b7c2b9c923941a14b3e1f42897b1769eea28c3; // replace with your treasury wallet
    address public constant AI_ORACLE_AMOY = 0x27c3880C83B3BC7d0Cfb344e5e5DaFc98F8Ba562; // replace with your oracle wallet

    function setUp() public {}

    function run() public {
        // Get the network name
        string memory network = vm.envOr("NETWORK", string("amoy"));

        address treasuryAddress;
        address aiOracleAddress;
        address mockUSDC = address(0); // placeholder for legacy param

        if (
            keccak256(abi.encodePacked(network)) ==
            keccak256(abi.encodePacked("amoy"))
        ) {
            // Use fixed test addresses for Polygon Amoy
            treasuryAddress = TREASURY_AMOY;
            aiOracleAddress = AI_ORACLE_AMOY;
        } else {
            // Local testing fallback
            treasuryAddress = msg.sender;
            aiOracleAddress = msg.sender;
            mockUSDC = deployMockPOL();
        }

        console.log("🚀 Deploying FullDike on network:", network);
        console.log("Treasury:", treasuryAddress);
        console.log("AI Oracle:", aiOracleAddress);

        vm.startBroadcast();

        // Deploy with dummy ERC20 (not used for native POL)
        fullDike = new FullDike(mockUSDC, treasuryAddress, aiOracleAddress);

        vm.stopBroadcast();

        console.log("✅ FullDike deployed at:", address(fullDike));
        console.log("Owner:", fullDike.owner());
        console.log("Treasury:", fullDike.treasury());
        console.log("AI Oracle:", fullDike.aiOracle());
    }

    // Optional mock POL token (if FullDike expects ERC20)
    function deployMockPOL() internal returns (address) {
        console.log("Deploying mock POL token for local testing...");
        vm.startBroadcast();
        MockPOL mock = new MockPOL();
        vm.stopBroadcast();
        console.log("Mock POL deployed at:", address(mock));
        return address(mock);
    }
}

/// Simple mock POL token (ERC20-like)
contract MockPOL {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public totalSupply = 1_000_000 * 1e18;
    string public name = "Mock POL";
    string public symbol = "POL";
    uint8 public decimals = 18;

    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
}
