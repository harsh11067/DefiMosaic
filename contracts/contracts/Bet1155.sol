// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Bet1155 is ERC1155, Ownable {
    // tokenId => total supply
    mapping(uint256 => uint256) public totalSupply;
    // tokenId => resolved result (0 unknown, 1 win, 2 lose)
    mapping(uint256 => uint8) public result;

    constructor() ERC1155("") Ownable(msg.sender) {}

    function mint(uint256 tokenId, uint256 amount) external payable {
        _mint(msg.sender, tokenId, amount, "");
        totalSupply[tokenId] += amount;
    }

    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }

    function resolve(uint256 tokenId, uint8 outcome) external onlyOwner {
        require(outcome == 1 || outcome == 2, "invalid outcome");
        result[tokenId] = outcome;
    }
}



