// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ILaunchMigrator} from "./interfaces/ILaunchMigrator.sol";

interface ILaunchStatus {
    function isMigrated(address token) external view returns (bool);
}

/// @title LaunchToken
/// @notice Fixed-supply ERC-20 created by the Achilyon launchpad. The whole
///         supply is minted once to the launchpad at construction; there is no
///         owner, no mint, no transfer tax and no blacklist. EIP-2612 `permit`
///         lets holders sell back to the curve in a single transaction.
///
///         One rule: until its curve has migrated, the token cannot be sent to
///         the DEX pool it will migrate into. This stops anyone seeding that
///         pool early at a manipulated price and capturing part of the
///         migrated liquidity. After migration it is an ordinary ERC-20.
contract LaunchToken is ERC20, ERC20Permit {
    /// @notice The launchpad that deployed this token and holds the curve supply.
    address public immutable launchpad;
    /// @notice The account that launched this token.
    address public immutable creator;
    /// @notice The DEX pool this token migrates into (may not exist yet).
    address public immutable pool;

    error PoolLocked();

    constructor(string memory name_, string memory symbol_, uint256 totalSupply_, address creator_, ILaunchMigrator migrator_)
        ERC20(name_, symbol_)
        ERC20Permit(name_)
    {
        launchpad = msg.sender;
        creator = creator_;
        pool = migrator_.poolFor(address(this));
        _mint(msg.sender, totalSupply_);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (to == pool && !ILaunchStatus(launchpad).isMigrated(address(this))) revert PoolLocked();
        super._update(from, to, value);
    }
}
