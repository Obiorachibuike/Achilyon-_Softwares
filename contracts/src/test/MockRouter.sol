// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Test-only stand-in for a Uniswap V2 Router02's `factory()` / `WETH()` getters.
contract MockRouter {
    address public immutable factory;
    address public immutable WETH;

    constructor(address factory_, address weth_) {
        factory = factory_;
        WETH = weth_;
    }
}
