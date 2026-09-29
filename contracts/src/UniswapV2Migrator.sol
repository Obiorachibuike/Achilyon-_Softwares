// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ILaunchMigrator} from "./interfaces/ILaunchMigrator.sol";

interface IUniswapV2Factory {
    function getPair(address a, address b) external view returns (address);
    function createPair(address a, address b) external returns (address);
    function allPairs(uint256 i) external view returns (address);
    function allPairsLength() external view returns (uint256);
}

interface IUniswapV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function mint(address to) external returns (uint256 liquidity);
}

interface IWrappedNative {
    function deposit() external payable;
}

/// @title UniswapV2Migrator
/// @notice Graduates completed Achilyon curves into a Uniswap V2-compatible
///         token/wrapped-native pool and burns the LP tokens, so the liquidity
///         can never be withdrawn.
///
///         - The pool opens at the curve's final price. Liquidity tokens beyond
///           what that price needs are sent to the dead address. If there are
///           fewer, all of them are used and the pool opens above the curve
///           price (never below, so curve buyers are not diluted).
///         - Liquidity is minted on the pair directly rather than through the
///           router, so a dust donation + `sync()` cannot block migration.
///         - `poolFor` is computed with CREATE2, so `LaunchToken` can lock the
///           pool address before it exists. The init-code hash is checked
///           against an existing pair at deployment when the factory has one.
contract UniswapV2Migrator is ILaunchMigrator {
    using SafeERC20 for IERC20;

    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    address public immutable launchpad;
    IUniswapV2Factory public immutable factory;
    address public immutable wrappedNative;
    bytes32 public immutable pairInitCodeHash;

    event PoolSeeded(
        address indexed token,
        address indexed pool,
        uint256 tokenAmount,
        uint256 quoteAmount,
        uint256 tokensBurned,
        uint256 liquidityBurned
    );

    error OnlyLaunchpad();
    error ZeroAddress();
    error ZeroAmount();
    error InitCodeHashMismatch();

    constructor(address launchpad_, IUniswapV2Factory factory_, address wrappedNative_, bytes32 pairInitCodeHash_) {
        if (launchpad_ == address(0) || address(factory_) == address(0) || wrappedNative_ == address(0)) {
            revert ZeroAddress();
        }
        launchpad = launchpad_;
        factory = factory_;
        wrappedNative = wrappedNative_;
        pairInitCodeHash = pairInitCodeHash_;
        if (factory_.allPairsLength() > 0) {
            IUniswapV2Pair sample = IUniswapV2Pair(factory_.allPairs(0));
            if (_pairFor(sample.token0(), sample.token1()) != address(sample)) revert InitCodeHashMismatch();
        }
    }

    function poolFor(address token) public view returns (address) {
        (address t0, address t1) = token < wrappedNative ? (token, wrappedNative) : (wrappedNative, token);
        return _pairFor(t0, t1);
    }

    function _pairFor(address t0, address t1) private view returns (address) {
        return address(
            uint160(uint256(keccak256(abi.encodePacked(hex"ff", address(factory), keccak256(abi.encodePacked(t0, t1)), pairInitCodeHash))))
        );
    }

    function migrate(address token, uint256 tokenAmount, uint256 virtualQuoteReserve, uint256 virtualTokenReserve)
        external
        payable
        returns (address pool)
    {
        if (msg.sender != launchpad) revert OnlyLaunchpad();
        uint256 quoteAmount = msg.value;
        if (quoteAmount == 0 || tokenAmount == 0 || virtualQuoteReserve == 0) revert ZeroAmount();

        // Tokens that match the curve's final price for the quote raised.
        uint256 tokensForPool = Math.min(tokenAmount, Math.mulDiv(quoteAmount, virtualTokenReserve, virtualQuoteReserve));
        uint256 tokensBurned = tokenAmount - tokensForPool;

        pool = factory.getPair(token, wrappedNative);
        if (pool == address(0)) pool = factory.createPair(token, wrappedNative);

        IWrappedNative(wrappedNative).deposit{value: quoteAmount}();
        IERC20(wrappedNative).safeTransfer(pool, quoteAmount);
        IERC20(token).safeTransfer(pool, tokensForPool);
        if (tokensBurned > 0) IERC20(token).safeTransfer(DEAD, tokensBurned);
        uint256 liquidity = IUniswapV2Pair(pool).mint(DEAD);

        emit PoolSeeded(token, pool, tokensForPool, quoteAmount, tokensBurned, liquidity);
    }
}
