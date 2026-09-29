// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {LaunchToken} from "./LaunchToken.sol";
import {ILaunchMigrator} from "./interfaces/ILaunchMigrator.sol";

/// @title AchilyonLaunchpad
/// @notice Creates fixed-supply tokens and sells them on a virtual-reserve
///         constant-product bonding curve priced in the chain's native currency:
///
///             (virtualQuote + raised) · (virtualToken − sold) = k
///
///         Virtual reserves are sized so every curve starts at the same market
///         cap (`startMarketCapQuote`) regardless of supply — the same maths as
///         `launchCurveConfig` in the Achilyon app.
///
///         Safety properties (covered by tests):
///         - Rounding always favours the curve, so `k` never decreases and the
///           quote reserve always covers every outstanding curve token.
///         - Only tokens bought from the curve can be sold back to it, so the
///           creator allocation can never drain buyers' funds beyond curve price.
///         - Every trade has a slippage bound and a deadline.
///         - Selling is never paused: holders can always exit while the curve
///           is active. Pausing only blocks launches and buys.
///         - Fees are pull-based; the fee rate is snapshotted per curve and
///           capped at `MAX_FEE_BPS`.
///         - The migrator is fixed at deployment and cannot be changed.
contract AchilyonLaunchpad is Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Constants ──────────────────────────────────────────────────────────
    uint256 public constant BPS = 10_000;
    uint256 public constant MAX_FEE_BPS = 200;
    /// @dev virtualToken = supply · (curveBps + 2 800) / 10 000 — i.e. 28% headroom.
    uint256 public constant VIRTUAL_TOKEN_EXTRA_BPS = 2_800;
    uint256 public constant MIN_CURVE_BPS = 5_000;
    uint256 public constant MAX_CURVE_BPS = 9_000;
    uint256 public constant MAX_CREATOR_BPS = 1_000;
    uint256 public constant MIN_LIQUIDITY_BPS = 1_000;
    uint256 public constant MIN_SUPPLY = 1_000_000 ether;
    uint256 public constant MAX_SUPPLY = 1_000_000_000_000 ether;
    uint256 public constant MAX_NAME_BYTES = 32;
    uint256 public constant MAX_SYMBOL_BYTES = 10;
    uint256 public constant MAX_METADATA_BYTES = 2_048;

    // ─── Types ──────────────────────────────────────────────────────────────
    struct CreateParams {
        string name;
        string symbol;
        /// @dev Off-chain metadata (description, links). Emitted, not stored.
        string metadataURI;
        uint256 totalSupply;
        uint16 curveBps;
        uint16 creatorBps;
    }

    struct Curve {
        address creator;
        uint16 feeBps;
        bool complete;
        bool migrated;
        uint256 virtualTokenReserve;
        uint256 virtualQuoteReserve;
        /// @dev Curve tokens still for sale.
        uint256 realTokenReserve;
        /// @dev Native currency held for this curve, net of fees.
        uint256 realQuoteReserve;
        uint256 curveSupply;
        /// @dev Tokens reserved for DEX liquidity at migration.
        uint256 liquidityTokens;
    }

    // ─── Storage ────────────────────────────────────────────────────────────
    /// @notice Starting market cap of every curve, in wei of the native currency.
    uint256 public immutable startMarketCapQuote;
    uint16 public feeBps;
    address public feeRecipient;
    uint256 public accruedFees;
    /// @notice Receives completed curves. Immutable: set once at deployment.
    ILaunchMigrator public immutable migrator;
    mapping(address token => Curve) private _curves;
    address[] public allTokens;

    // ─── Events ─────────────────────────────────────────────────────────────
    /// @dev Reserves follow from these inputs (see `createToken`) or `getCurve`.
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        string metadataURI,
        uint256 totalSupply,
        uint16 curveBps,
        uint16 creatorBps,
        uint16 feeBps
    );
    event Trade(
        address indexed token,
        address indexed trader,
        bool isBuy,
        uint256 quoteAmount,
        uint256 tokenAmount,
        uint256 fee,
        uint256 virtualTokenReserve,
        uint256 virtualQuoteReserve,
        uint256 realQuoteReserve
    );
    event CurveCompleted(address indexed token, uint256 realQuoteReserve);
    event Migrated(address indexed token, address indexed pool, uint256 quoteAmount, uint256 tokenAmount);
    event FeeBpsUpdated(uint16 feeBps);
    event FeeRecipientUpdated(address feeRecipient);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // ─── Errors ─────────────────────────────────────────────────────────────
    error DeadlineExpired();
    error UnknownToken();
    error CurveIsComplete();
    error CurveNotComplete();
    error AlreadyMigrated();
    error ZeroAmount();
    error SlippageExceeded(uint256 amountOut, uint256 minAmountOut);
    error ExceedsCurveSold();
    error InvalidName();
    error InvalidSymbol();
    error InvalidMetadata();
    error InvalidSupply();
    error InvalidAllocation();
    error FeeTooHigh();
    error ZeroAddress();
    error NativeTransferFailed();

    constructor(
        address owner_,
        address feeRecipient_,
        uint256 startMarketCapQuote_,
        uint16 feeBps_,
        ILaunchMigrator migrator_
    ) Ownable(owner_) {
        if (feeRecipient_ == address(0) || address(migrator_) == address(0)) revert ZeroAddress();
        migrator = migrator_;
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        if (startMarketCapQuote_ == 0) revert ZeroAmount();
        startMarketCapQuote = startMarketCapQuote_;
        feeRecipient = feeRecipient_;
        feeBps = feeBps_;
    }

    modifier beforeDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        _;
    }

    // ─── Launch ─────────────────────────────────────────────────────────────

    /// @notice Launches a token. Any `msg.value` is spent as the creator's
    ///         initial buy on the new curve (subject to `minTokensOut`).
    function createToken(CreateParams calldata p, uint256 minTokensOut, uint256 deadline)
        external
        payable
        whenNotPaused
        nonReentrant
        beforeDeadline(deadline)
        returns (address token)
    {
        _validate(p);
        token = address(new LaunchToken(p.name, p.symbol, p.totalSupply, msg.sender, migrator));
        _registerCurve(token, p);

        if (msg.value > 0) {
            _buy(token, msg.value, minTokensOut);
        } else if (minTokensOut > 0) {
            revert SlippageExceeded(0, minTokensOut);
        }
    }

    function _validate(CreateParams calldata p) private pure {
        uint256 nameLen = bytes(p.name).length;
        uint256 symbolLen = bytes(p.symbol).length;
        if (nameLen == 0 || nameLen > MAX_NAME_BYTES) revert InvalidName();
        if (symbolLen == 0 || symbolLen > MAX_SYMBOL_BYTES) revert InvalidSymbol();
        if (bytes(p.metadataURI).length > MAX_METADATA_BYTES) revert InvalidMetadata();
        if (p.totalSupply < MIN_SUPPLY || p.totalSupply > MAX_SUPPLY) revert InvalidSupply();
        if (
            p.curveBps < MIN_CURVE_BPS || p.curveBps > MAX_CURVE_BPS || p.creatorBps > MAX_CREATOR_BPS
                || BPS - p.curveBps - p.creatorBps < MIN_LIQUIDITY_BPS
        ) revert InvalidAllocation();
    }

    function _registerCurve(address token, CreateParams calldata p) private {
        uint256 curveSupply = p.totalSupply * p.curveBps / BPS;
        uint256 creatorAmount = p.totalSupply * p.creatorBps / BPS;
        uint256 extra = uint256(p.curveBps) + VIRTUAL_TOKEN_EXTRA_BPS;
        _curves[token] = Curve({
            creator: msg.sender,
            feeBps: feeBps,
            complete: false,
            migrated: false,
            virtualTokenReserve: p.totalSupply * extra / BPS,
            // price₀ = vQ / vT = startMarketCap / supply  ⇒  vQ = startMarketCap · (curveBps + extra) / BPS
            virtualQuoteReserve: startMarketCapQuote * extra / BPS,
            realTokenReserve: curveSupply,
            realQuoteReserve: 0,
            curveSupply: curveSupply,
            liquidityTokens: p.totalSupply - curveSupply - creatorAmount
        });
        allTokens.push(token);
        if (creatorAmount > 0) IERC20(token).safeTransfer(msg.sender, creatorAmount);
        emit TokenCreated(token, msg.sender, p.name, p.symbol, p.metadataURI, p.totalSupply, p.curveBps, p.creatorBps, feeBps);
    }

    // ─── Trading ────────────────────────────────────────────────────────────

    /// @notice Buys with `msg.value`. If the order exceeds the remaining curve
    ///         supply it is clipped and the excess is refunded.
    function buy(address token, uint256 minTokensOut, uint256 deadline)
        external
        payable
        whenNotPaused
        nonReentrant
        beforeDeadline(deadline)
        returns (uint256 tokensOut)
    {
        return _buy(token, msg.value, minTokensOut);
    }

    /// @notice Sells `tokenAmount` back to the curve. Requires an allowance.
    ///         Not affected by `pause()`.
    function sell(address token, uint256 tokenAmount, uint256 minQuoteOut, uint256 deadline)
        external
        nonReentrant
        beforeDeadline(deadline)
        returns (uint256 quoteOut)
    {
        return _sell(token, tokenAmount, minQuoteOut);
    }

    /// @notice `sell` with an EIP-2612 permit, so no separate approval is needed.
    /// @dev The permit is wrapped in try/catch so a front-run permit (which
    ///      already set the allowance) cannot grief the sale.
    function sellWithPermit(
        address token,
        uint256 tokenAmount,
        uint256 minQuoteOut,
        uint256 deadline,
        uint256 permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant beforeDeadline(deadline) returns (uint256 quoteOut) {
        try IERC20Permit(token).permit(msg.sender, address(this), tokenAmount, permitDeadline, v, r, s) {} catch {}
        return _sell(token, tokenAmount, minQuoteOut);
    }

    function _buy(address token, uint256 quoteIn, uint256 minTokensOut) private returns (uint256 tokensOut) {
        Curve storage c = _activeCurve(token);
        if (quoteIn == 0) revert ZeroAmount();

        uint256 fee;
        uint256 net;
        uint256 refund;
        (tokensOut, net, fee, refund) = _quoteBuy(c, quoteIn);
        if (tokensOut == 0 || tokensOut < minTokensOut) revert SlippageExceeded(tokensOut, minTokensOut);

        c.virtualTokenReserve -= tokensOut;
        c.virtualQuoteReserve += net;
        c.realTokenReserve -= tokensOut;
        c.realQuoteReserve += net;
        accruedFees += fee;

        IERC20(token).safeTransfer(msg.sender, tokensOut);
        emit Trade(
            token, msg.sender, true, net + fee, tokensOut, fee, c.virtualTokenReserve, c.virtualQuoteReserve,
            c.realQuoteReserve
        );
        if (c.realTokenReserve == 0) {
            c.complete = true;
            emit CurveCompleted(token, c.realQuoteReserve);
        }
        if (refund > 0) _sendNative(msg.sender, refund);
    }

    function _sell(address token, uint256 tokenAmount, uint256 minQuoteOut) private returns (uint256 quoteOut) {
        Curve storage c = _activeCurve(token);
        if (tokenAmount == 0) revert ZeroAmount();
        uint256 gross;
        uint256 fee;
        (quoteOut, gross, fee) = _quoteSell(c, tokenAmount);
        if (quoteOut < minQuoteOut) revert SlippageExceeded(quoteOut, minQuoteOut);

        c.virtualTokenReserve += tokenAmount;
        c.virtualQuoteReserve -= gross;
        c.realTokenReserve += tokenAmount;
        c.realQuoteReserve -= gross;
        accruedFees += fee;

        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);
        emit Trade(
            token, msg.sender, false, quoteOut, tokenAmount, fee, c.virtualTokenReserve, c.virtualQuoteReserve,
            c.realQuoteReserve
        );
        _sendNative(msg.sender, quoteOut);
    }

    // ─── Migration ──────────────────────────────────────────────────────────

    /// @notice Moves a completed curve's reserves into its DEX pool via the
    ///         migrator. Permissionless — anyone can pay the gas to graduate.
    function migrate(address token) external nonReentrant returns (address pool) {
        Curve storage c = _curves[token];
        if (c.creator == address(0)) revert UnknownToken();
        if (!c.complete) revert CurveNotComplete();
        if (c.migrated) revert AlreadyMigrated();
        ILaunchMigrator m = migrator;

        uint256 quoteAmount = c.realQuoteReserve;
        uint256 tokenAmount = c.liquidityTokens + c.realTokenReserve;
        c.migrated = true;
        c.realQuoteReserve = 0;
        c.realTokenReserve = 0;
        c.liquidityTokens = 0;

        // `migrated` is set first: it also unlocks transfers into the pool.
        IERC20(token).safeTransfer(address(m), tokenAmount);
        pool = m.migrate{value: quoteAmount}(token, tokenAmount, c.virtualQuoteReserve, c.virtualTokenReserve);
        emit Migrated(token, pool, quoteAmount, tokenAmount);
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    function getCurve(address token) external view returns (Curve memory) {
        return _curves[token];
    }

    /// @notice True once a curve's liquidity has moved to its DEX pool.
    function isMigrated(address token) external view returns (bool) {
        return _curves[token].migrated;
    }

    function tokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    /// @notice Exact result of `buy(token)` with `quoteIn` at the current state.
    function quoteBuy(address token, uint256 quoteIn)
        external
        view
        returns (uint256 tokensOut, uint256 fee, uint256 refund)
    {
        Curve storage c = _activeCurve(token);
        if (quoteIn == 0) return (0, 0, 0);
        (tokensOut,, fee, refund) = _quoteBuy(c, quoteIn);
    }

    /// @notice Exact result of `sell(token)` with `tokenAmount` at the current state.
    function quoteSell(address token, uint256 tokenAmount) external view returns (uint256 quoteOut, uint256 fee) {
        Curve storage c = _activeCurve(token);
        if (tokenAmount == 0) return (0, 0);
        (quoteOut,, fee) = _quoteSell(c, tokenAmount);
    }

    /// @notice Marginal price in wei per 1e18 token base units.
    function spotPrice(address token) external view returns (uint256) {
        Curve storage c = _curves[token];
        if (c.creator == address(0)) revert UnknownToken();
        return Math.mulDiv(c.virtualQuoteReserve, 1 ether, c.virtualTokenReserve);
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    /// @notice Applies to curves created after the change only.
    function setFeeBps(uint16 feeBps_) external onlyOwner {
        if (feeBps_ > MAX_FEE_BPS) revert FeeTooHigh();
        feeBps = feeBps_;
        emit FeeBpsUpdated(feeBps_);
    }

    function setFeeRecipient(address feeRecipient_) external onlyOwner {
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        feeRecipient = feeRecipient_;
        emit FeeRecipientUpdated(feeRecipient_);
    }

    /// @notice Sends accrued fees to `feeRecipient`. Callable by anyone.
    function withdrawFees() external nonReentrant {
        uint256 amount = accruedFees;
        if (amount == 0) revert ZeroAmount();
        accruedFees = 0;
        address to = feeRecipient;
        _sendNative(to, amount);
        emit FeesWithdrawn(to, amount);
    }

    /// @notice Blocks new launches and buys. Sells and migration stay open.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── Internals ──────────────────────────────────────────────────────────

    function _activeCurve(address token) private view returns (Curve storage c) {
        c = _curves[token];
        if (c.creator == address(0)) revert UnknownToken();
        if (c.complete) revert CurveIsComplete();
    }

    /// @dev Rounds tokens out down and quote in up, in favour of the curve.
    function _quoteBuy(Curve storage c, uint256 quoteIn)
        private
        view
        returns (uint256 tokensOut, uint256 net, uint256 fee, uint256 refund)
    {
        uint256 vT = c.virtualTokenReserve;
        uint256 vQ = c.virtualQuoteReserve;
        uint256 f = c.feeBps;
        fee = quoteIn * f / BPS;
        net = quoteIn - fee;
        tokensOut = vT - Math.mulDiv(vT, vQ, vQ + net, Math.Rounding.Ceil);
        if (tokensOut >= c.realTokenReserve) {
            // Clip to the end of the curve and refund the rest.
            tokensOut = c.realTokenReserve;
            net = Math.mulDiv(vT, vQ, vT - tokensOut, Math.Rounding.Ceil) - vQ;
            fee = Math.mulDiv(net, f, BPS - f, Math.Rounding.Ceil);
            // net ≤ original net, but the rounded-up fee can exceed the budget by 1 wei.
            if (net + fee > quoteIn) fee = quoteIn - net;
            refund = quoteIn - net - fee;
        }
    }

    /// @dev Rounds quote out down, in favour of the curve.
    function _quoteSell(Curve storage c, uint256 tokenAmount)
        private
        view
        returns (uint256 quoteOut, uint256 gross, uint256 fee)
    {
        // Only tokens that were bought from the curve can be sold back to it.
        if (tokenAmount > c.curveSupply - c.realTokenReserve) revert ExceedsCurveSold();
        uint256 vT = c.virtualTokenReserve;
        uint256 vQ = c.virtualQuoteReserve;
        gross = vQ - Math.mulDiv(vT, vQ, vT + tokenAmount, Math.Rounding.Ceil);
        // Defensive: rounding guarantees gross ≤ realQuoteReserve; never pay out more.
        if (gross > c.realQuoteReserve) gross = c.realQuoteReserve;
        fee = gross * c.feeBps / BPS;
        quoteOut = gross - fee;
    }

    function _sendNative(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert NativeTransferFailed();
    }
}
