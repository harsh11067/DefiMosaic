// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "./interfaces/AggregatorV3Interface.sol";

contract MockV3Aggregator is AggregatorV3Interface {
    int256 private _latestAnswer;

    constructor(int256 initialAnswer) {
        _latestAnswer = initialAnswer;
    }

    function updateAnswer(int256 newAnswer) external {
        _latestAnswer = newAnswer;
    }

    function latestRoundData() external view override returns (
        uint80,
        int256 answer,
        uint256,
        uint256,
        uint80
    ) {
        return (0, _latestAnswer, 0, block.timestamp, 0);
    }
}
