# Achilyon launchpad contracts

The contracts are Solidity 0.8.x with OpenZeppelin 5, compiled by `solc-js`
0.8.37 (optimizer at 200 runs, EVM `cancun`).

| Contract | Role |
| --- | --- |
| `AchilyonLaunchpad` | The factory plus the bonding-curve market for every token it launches. It holds the curve's tokens and native currency. |
| `LaunchToken` | An ERC-20 with EIP-2612 `permit`. The full supply is minted to the launchpad once. It has **no owner, mint, pause, blacklist or tax.** Its one rule is that it can't be sent to its future DEX pool before graduation (see below). |
| `UniswapV2Migrator` | Graduates completed curves into a Uniswap V2-compatible token/wrapped-native pool and burns the LP tokens. |

`interfaces/ILaunchMigrator.sol` is the interface a migrator implements.
`test/` holds contracts used only by the test suite.

> **Status: unaudited, and not deployed by this repository.** Treat any
> deployment as experimental until an independent audit is done.

## Curve model

The curve is a virtual-reserve constant product, the same maths the app uses
in `src/lib/bondingCurve`. It is ported exactly with bigints in
`src/lib/contracts/curveMath.ts`.

```
vT₀ = supply · (curveBps + 2800) / 10000        virtual token reserve
vQ₀ = startMarketCapQuote · (curveBps + 2800) / 10000
price = vQ / vT                                 k = vQ · vT stays constant
```

- **Starting market cap.** Every token starts at the same market cap,
  `startMarketCapQuote`, whatever its supply. This value is set once in the
  constructor.
- **Buys.**
  - The fee (`feeBps`, capped at 2%) comes off the input first.
  - `tokensOut = vT − ⌈k / (vQ + net)⌉`, which rounds in the curve's favour.
  - A buy that would pass the end of the curve is clipped to exactly the
    remaining supply, and the excess native currency is refunded in the same
    transaction.
- **Sells.**
  - `gross = vQ − ⌈k / (vT + amount)⌉`, capped at the real reserve, and the fee
    is taken off `gross`.
  - Only tokens that were bought from the curve can be sold back to it
    (`ExceedsCurveSold`).
- **Completion.** When the curve supply sells out, the curve is marked
  complete and curve trading stops (`CurveIsComplete`). After that, **anyone**
  can call `migrate` to graduate the token (see [Graduation](#graduation)).
- **Allocations.**
  - Curve: 50–90%.
  - Creator: 0–10%, transferred to the creator at launch.
  - DEX liquidity: at least 10%.
  - Supply: 1M to 1T tokens with 18 decimals.

With the defaults (1B supply, 80% curve, a start market cap of 1.5625 ETH ≈ $5K
at $3,200), a curve completes after ≈ 4.82 ETH net is raised. The market cap at
that point is ≈ 23.2 ETH (≈ $74K).

## Graduation

`migrate(token)` is permissionless. It sends the curve's raised native currency
and the liquidity allocation to the migrator, and the migrator:

1. **Opens the pool at the curve's final price.** It uses
   `min(liquidityTokens, raised · vT / vQ)` tokens and sends any surplus to
   `0x…dEaD`. If there are fewer tokens than that price needs, all of them go
   in and the pool opens *above* the curve price. It never opens below, so
   curve buyers are never diluted at graduation.
   - With the defaults (80% curve, 0% creator), the 20% liquidity allocation
     is just under the ≈ 20.7% the price needs, so the pool opens about 3.7%
     above the final curve price.
   - On a 50% curve, the surplus is burned, and the pool opens at exactly the
     final price.
2. **Mints on the pair directly** (wrap → transfer → `mint`) instead of going
   through the router. The router reverts forever on a pair that holds dust
   WETH after a `sync()`, which would be a cheap way to block migration.
3. **Burns the LP tokens** by minting them to `0x…dEaD`, so the liquidity can
   never be withdrawn.

**Pre-seeding protection.**
- *The attack:* anyone can create the token/WETH pair early and add a sliver of
  liquidity at a skewed price. The migration's liquidity would then land at
  that price, and the attacker's LP share would take a cut of it.
- *The defence:* each `LaunchToken` stores the address of its future pool,
  which the migrator computes with CREATE2 (`poolFor`), and rejects transfers
  into it (`PoolLocked`) until its curve has migrated. Without tokens in the
  pool, nobody can create liquidity there. A WETH-only donation just becomes
  part of the burned liquidity.

**Init-code hash.** `poolFor` depends on the DEX's pair init-code hash.
- Uniswap V2's hash is
  `0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f`.
  The tests compute it from the official `@uniswap/v2-core` artifacts.
- Forks such as PancakeSwap use a different hash, and so do some deployments.
- If the factory already has a pair, the migrator's constructor checks the hash
  against it and reverts on a mismatch. The deploy script runs that
  constructor with `eth_call` before sending anything.

## Trust model

| Power | Who | Limits |
| --- | --- | --- |
| `pause` / `unpause` | owner (`Ownable2Step`) | Blocks only `createToken` and `buy`. **Selling is never paused**, so holders can always exit. |
| `setFeeBps` | owner | Capped at 2%, and applies to **new curves only**. Each curve keeps the fee it was created with. |
| `migrate` | anyone | Only for a completed curve that hasn't been migrated. The migrator is an **immutable constructor argument**, so the owner cannot change it. |
| `withdrawFees` | anyone | Always pays the configured `feeRecipient`. |
| `setFeeRecipient` | owner | Must not be the zero address. |

There are no upgrades and no proxy. Neither the owner nor anyone else can move
curve reserves or user tokens, except through `migrate` on a completed curve.
That call sends everything to the migrator fixed at deployment, so **the
launchpad + migrator pair is what needs auditing**. `UniswapV2Migrator` has no
owner and no admin functions. Only the launchpad can call it.

### Not enforced on-chain

The launch wizard and the API schema have **anti-snipe** and **max-wallet**
fields. The contracts **do not enforce either one**. Anti-snipe protection
depends on timing, and max-wallet limits can be bypassed by splitting across
addresses, so neither is implemented here. The UI does not claim that they
are enforced.

Other known gaps:

- **Graduation is a separate transaction.** After the completing buy, the
  curve stays closed until someone calls `migrate`. The app shows a "Graduate"
  button for this. `migrate` costs ≈ 2.75M gas, most of it for creating the
  pair.
- **After graduation, prices on Achilyon come from pool reserves.** Pool swaps
  aren't indexed, so the chart and activity feed show curve history only.
  Achilyon does not route DEX swaps in-app.
- **Burned surplus stays in `totalSupply`.** Tokens sent to `0x…dEaD` are
  still counted there, so market cap is computed on the full supply.
- **MEV.** Every trade takes `minOut` and `deadline`, and the UI derives them
  from the user's slippage setting and a 10-minute window. Sandwiching inside
  that tolerance is still possible, as on any AMM.
- **Logos** are not stored on-chain. `metadataURI` is a small inline
  `data:application/json;base64` document (at most 2048 bytes) containing the
  description and https links. The app sanitises it when reading.

## Safety properties covered by tests

`src/lib/contracts/launchpad.contract.test.ts` runs these checks on an
in-process EVM (Hardhat EDR):

- A 60-trade differential fuzz confirms that contract state equals the
  TypeScript port **to the wei** after every trade.
- Throughout the fuzz, the launchpad's native balance covers the curve's real
  reserve.
- Reentrancy through a malicious receiver fails. A refund to a
  non-receiving contract reverts cleanly.
- Slippage, deadlines, zero amounts, unknown tokens, completed curves, direct
  native transfers, pause scope, fee caps and the migrate hand-off each have
  their own test.
- `migrator.contract.test.ts` runs graduation against the **official Uniswap V2
  factory and pair bytecode**:
  - pool-address prediction and the init-code-hash check;
  - the price-continuity and surplus-burn maths;
  - LP burning, with nothing left in the launchpad or the migrator;
  - pre-seeding blocked (`transfer` and `transferFrom` into the pool);
  - the donate-and-`sync` DoS defeated;
  - x·y=k swaps working after graduation.
- `LaunchToken` exposes no privileged functions.
- The contracts fit the EIP-170 size limit, and the committed artifacts match a
  fresh compile.

## Gas (measured on the local EVM)

| Call | Gas |
| --- | --- |
| `createToken` (no initial buy) | ≈ 1.19M |
| `buy` | ≈ 128k |
| `migrate` (creates the pair) | ≈ 2.75M |

## Tooling

```bash
npm run contracts:build     # compile → contracts/artifacts/*.json + src/lib/contracts/abi.ts
npx vitest run src/lib/contracts   # contract, client and deploy-script tests on EDR
npm run contracts:node      # local JSON-RPC chain (31337) to try the full flow with a browser wallet
```

The committed artifacts are what the app and the deploy script use. A test
fails if they drift from the sources.

## Deploying

This repository **does not deploy anything**. When you are ready (ideally
after an audit, and on a testnet first), run:

```bash
# 1. Preview. Checks the chain id, your balance and the DEX contracts, predicts
#    both addresses and dry-runs the migrator's constructor. Sends nothing.
DEPLOYER_PRIVATE_KEY=0x… RPC_URL=https://ethereum-sepolia-rpc.publicnode.com CHAIN=ethereum \
EVM_CHAIN_ID=11155111 TESTNET=true EXPLORER_URL=https://sepolia.etherscan.io \
DEX_ROUTER=0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3 \
FEE_RECIPIENT=0x… START_MCAP=1.5625 \
  npm run contracts:deploy -- --dry-run

# 2. Deploy. Real networks require --yes.
… npm run contracts:deploy -- --yes
```

| Variable | Required | Notes |
| --- | --- | --- |
| `DEPLOYER_PRIVATE_KEY` | yes | Read only by this CLI process. Keep it in your shell or a secret manager. Never put it in `.env.local` or anything that is committed. |
| `RPC_URL` | yes | Its chain id must match `EVM_CHAIN_ID`. |
| `CHAIN` | yes | One of `ethereum`, `base`, `arbitrum`, `polygon`, `bsc`, `avalanche`. |
| `START_MCAP` | yes | The starting market cap in native units. ≈ $5K is `1.5625` ETH, `8.47` BNB, `11111` POL or `178.6` AVAX at the app's reference prices. |
| `EVM_CHAIN_ID` / `TESTNET` | for testnets | A chain id other than mainnet requires `TESTNET=true`. |
| `OWNER`, `FEE_RECIPIENT`, `FEE_BPS` | no | Default to the deployer, the owner and `100` (1%). Use a multisig for `OWNER` in production. |
| `DEX_ROUTER` | yes, or both of the next two | A Uniswap V2 **Router02**. The script reads `factory()` and `WETH()` from it. |
| `DEX_FACTORY`, `WRAPPED_NATIVE` | alternative to `DEX_ROUTER` | If given together with a router, they must match it. |
| `PAIR_INIT_CODE_HASH` | no | Defaults to Uniswap V2's. **Required for forks** (e.g. PancakeSwap). |
| `DEX_NAME` | no | Display name, default `Uniswap V2`. Added to the env entry. |
| `EXPLORER_URL` | no | Explorer for testnet links. |

The script deploys the launchpad and then the migrator, from consecutive
nonces. Don't send other transactions from the deployer while it runs.

Uniswap lists its official V2 Router02 addresses at
<https://developers.uniswap.org/docs/protocols/v2/deployments>. For example,
Ethereum `0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D`, Sepolia
`0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3`, and Base, Arbitrum, Avalanche
and BNB Chain `0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24`. Check the address
on that page before deploying.

The script prints a JSON entry. Merge it into `NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS`
and rebuild the app. On-chain launch and trading turn on only for the listed
chains.
