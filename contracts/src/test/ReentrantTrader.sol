// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ILaunchpadLike {
    function buy(address token, uint256 minTokensOut, uint256 deadline) external payable returns (uint256);
    function sell(address token, uint256 tokenAmount, uint256 minQuoteOut, uint256 deadline) external returns (uint256);
}

/// @dev Test-only attacker that tries to re-enter the launchpad when it
///      receives a native refund or sale proceeds.
contract ReentrantTrader {
    ILaunchpadLike public immutable launchpad;
    address public token;
    bool public attempted;
    bool public reentrySucceeded;

    constructor(address launchpad_) {
        launchpad = ILaunchpadLike(launchpad_);
    }

    function buy(address token_) external payable {
        token = token_;
        launchpad.buy{value: msg.value}(token_, 0, block.timestamp + 1);
    }

    function sellAll() external {
        uint256 bal = IERC20(token).balanceOf(address(this));
        IERC20(token).approve(address(launchpad), type(uint256).max);
        launchpad.sell(token, bal / 2, 0, block.timestamp + 1);
    }

    receive() external payable {
        if (attempted) return;
        attempted = true;
        uint256 bal = IERC20(token).balanceOf(address(this));
        try launchpad.sell(token, bal / 4, 0, block.timestamp + 1) {
            reentrySucceeded = true;
        } catch {}
    }
}

/// @dev Test-only contract that cannot receive native currency.
contract NoReceive {
    function buy(address launchpad, address token) external payable {
        ILaunchpadLike(launchpad).buy{value: msg.value}(token, 0, block.timestamp + 1);
    }
}
