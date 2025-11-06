// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MultiversePrediction} from "../src/Dike.sol";

/// @title Deploy MultiversePrediction on Polygon Amoy
/// @notice Deploys for native POL token usage (no stablecoin)
contract DeployDikeScript is Script {
    MultiversePrediction public multiversePrediction;

    address public constant TREASURY_AMOY = 0xc2b7c2b9c923941a14b3e1f42897b1769eea28c3; // replace with your treasury wallet
    address public constant ORACLE_AMOY = 0x27c3880C83B3BC7d0Cfb344e5e5DaFc98F8Ba562;  // replace with your oracle wallet

    function setUp() public {}

    function run() public {
        string memory network = vm.envOr("NETWORK", string("amoy"));

        address mockPOL = address(0);

        if (
            keccak256(abi.encodePacked(network)) ==
            keccak256(abi.encodePacked("amoy"))
        ) {
            console.log("🌐 Network:", network);
        } else {
            mockPOL = deployMockPOL();
        }

        vm.startBroadcast();

        // If contract expects an ERC20, pass mockPOL, else pass address(0)
        multiversePrediction = new MultiversePrediction(mockPOL);

        vm.stopBroadcast();

        console.log("✅ MultiversePrediction deployed at:", address(multiversePrediction));
        console.log("Owner:", multiversePrediction.owner());
    }

    function deployMockPOL() internal returns (address) {
        console.log("Deploying mock POL token for local/local testnet...");
        vm.startBroadcast();
        MockPOL mock = new MockPOL();
        vm.stopBroadcast();
        console.log("Mock POL deployed at:", address(mock));
        return address(mock);
    }
}

/// Simple ERC20-style Mock POL for local testing
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
