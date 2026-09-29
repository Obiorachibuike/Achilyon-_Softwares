// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ILaunchMigrator} from "../interfaces/ILaunchMigrator.sol";

/// @dev Test-only migrator that records what it received.
contract MockMigrator is ILaunchMigrator {
    address public lastToken;
    uint256 public lastTokenAmount;
    uint256 public lastQuoteAmount;
    uint256 public lastVirtualQuote;
    uint256 public lastVirtualToken;
    uint256 public tokenBalanceAtCall;

    function poolFor(address token) public pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encode("pool", token)))));
    }

    function migrate(address token, uint256 tokenAmount, uint256 vQ, uint256 vT) external payable returns (address) {
        lastToken = token;
        lastTokenAmount = tokenAmount;
        lastQuoteAmount = msg.value;
        lastVirtualQuote = vQ;
        lastVirtualToken = vT;
        tokenBalanceAtCall = IERC20(token).balanceOf(address(this));
        return poolFor(token);
    }
}
