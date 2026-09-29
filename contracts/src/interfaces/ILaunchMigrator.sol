// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Moves a completed curve into a DEX pool. Fixed per launchpad at
///         deployment. Implementations must seed the pool at the curve's final
///         price and permanently lock or burn the resulting LP position.
interface ILaunchMigrator {
    /// @notice The pool a token will migrate into. Must be deterministic and
    ///         callable before the pool exists: `LaunchToken` blocks transfers
    ///         into this address until migration, so nobody can pre-seed it.
    function poolFor(address token) external view returns (address);

    /// @param token The launch token. `tokenAmount` of it has already been
    ///              transferred to the migrator before this call.
    /// @param tokenAmount Tokens available for liquidity.
    /// @param virtualQuoteReserve Curve reserves at completion; their ratio is
    /// @param virtualTokenReserve the final curve price the pool must open at.
    /// @dev `msg.value` is the curve's quote reserve (native currency).
    function migrate(address token, uint256 tokenAmount, uint256 virtualQuoteReserve, uint256 virtualTokenReserve)
        external
        payable
        returns (address pool);
}
