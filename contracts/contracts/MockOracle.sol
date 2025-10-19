// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockOracle {
    mapping(bytes32 => int256) public answers;

    function setAnswer(bytes32 key, int256 value) external {
        answers[key] = value;
    }

    function latestAnswer(bytes32 key) external view returns (int256) {
        return answers[key];
    }
}



