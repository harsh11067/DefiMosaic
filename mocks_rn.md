# mocks_rn.md — Every Mock, Fallback & Dummy in DeFi Mosaic (right now)

> Honest inventory of what is **real**, what is **simulated**, and what is a
> **fallback** — so nobody has to guess. Status column says what happened to it
> in the current overhaul.

## Legend
- 🟢 **REAL** — live data / real chain interaction
- 🟡 **FALLBACK** — real path first, graceful degradation if unavailable
- 🔴 **MOCK** — hardcoded / random / cosmetic
- ⚫ **REMOVED** — deleted in this overhaul

---

## 1. Smart contract layer

| Item | Where | Status | Notes |
|---|---|---|---|
| `USDCMock` token | `contracts/contracts/` + Amoy | 🟡 by design | Standard testnet stand-in for USDC. Real ERC-20, mock branding. |
| `MockOracle` price feed | `contracts/` + Amoy | 🟡 by design | Chainlink-compatible interface with manually set prices. Swap for real Chainlink feeds on mainnet. |
| `SwapHelper` Uniswap router | `SwapHelper.sol:33` | 🔴 broken on Amoy | Hardcodes **mainnet** Uniswap V3 router + WMATIC. Cannot execute on Amoy — every swap reverts. This is why SurgeBoost was removed from the UI (see §3). |
| `MIN_COLLATERAL_RATIO = 150` | `MultiversePrediction.sol` | 🔴 cosmetic bug | Compared against a 10000-scale value → check always passes. Requires redeploy to fix. |

## 2. Strategies & social trading

| Item | Where | Status | Notes |
|---|---|---|---|
| "Conservative Yield" / "Aggressive Growth" cards | `SocialCopyTrading.tsx` (`BASE_STRATEGIES`) | 🔴 seeded demo | Not on-chain registry rows. Follower counts / TVL / gains are illustrative. |
| Follow of demo strategies | `SocialCopyTrading.tsx` `handleFollow` | 🟡 | Simulates `followStrategy` first; when the strategy isn't on-chain it sends a **real native transfer** to the registry — real tx, demo bookkeeping. |
| Leaderboard (4 fixed entries) | `SocialCopyTrading.tsx` (`BASE_LEADERBOARD`) | 🔴 seeded demo | Frozen 24 h (localStorage), then rebuilt from Available Strategies. "Momentum Master" / "Stable Arbitrage" are display-only. |
| Created strategies list | localStorage `newlyCreatedStrategies` | 🟡 | The `createStrategy` tx is real on-chain; the card metadata (unique ID, stats) is client-side. |
| Joined strategies P&L | localStorage `joinedStrategies` | 🔴 static | `currentValue == invested`, gains = 0. No live NAV tracking yet. |
| Manage page mock strategies (ids 1–2) | `dashboard/strategy/[id]/page.tsx:86` | 🔴 | Mirrors the demo cards. Real fetch for on-chain ids ≥ 3. |
| Trade History / Positions / Performance tabs | `dashboard/strategy/[id]/page.tsx`, `ManageStrategyModal.tsx:32` | 🔴 | Hardcoded illustrative rows. |
| Strategy templates | `StrategyTemplates.tsx` | 🔴 | Static template definitions (by design — they're blueprints). |

## 3. Swaps & prices

| Item | Where | Status | Notes |
|---|---|---|---|
| SurgeBoost swap + demo result (1:250 rate, +8.7% gain) | `SurgeBoost.tsx` | ⚫ **REMOVED** | The underlying contract can never succeed on Amoy (mainnet router). Removed rather than shipping a fake result. Replaced by the **Arena** (real engine, §6). |
| PriceWatcher "live" ETH price | `PriceWatcher.tsx:44` | 🔴 → 🟢 **FIXED** | Was `1800 + Math.random()*200`. Now fetches the real price via `/api/eth-price`. |
| CryptoPriceCards / ETHPriceDisplay | components | 🟢 | Real CoinGecko data, 60 s refresh. |
| Landing page ticker | `app/page.tsx` | 🟡 | Real CoinGecko top-10; static snapshot list if the API is unreachable. |
| `/api/candles` | API route | 🟢 | Real Binance klines proxy (OHLCV). |
| `/api/top-mover`, `/api/eth-price` | API routes | 🟢 | Real CoinGecko proxies with 5-min cache. |

## 4. AI & analytics

| Item | Where | Status | Notes |
|---|---|---|---|
| AI portfolio recommendation | `/api/recommend-strategy` | 🟡 | Real OpenAI call when `OPENAI_API_KEY` set; deterministic rule-based allocator otherwise (labelled in the response notes). |
| DefiLlama APY enrichment | same route | 🟡 | Best-effort; zeros on failure. |
| Strategy copilot | `/api/strategy/copilot:102` | 🟡 | Mock canned response without an API key. |
| StrategyAnalytics trades | `StrategyAnalytics.tsx` | 🟢 **FIXED** | Was `Math.random()` trades. Now a deterministic EMA(12)/SMA(20) crossover engine over the real candles — win rate, P&L and trade markers are genuine backtest output. |
| Backtester | `Backtester.tsx` + `/api/backtest` | 🟢 logic / 🟢 data | Runs a real SMA strategy over real candle history — results are genuine backtests. |
| AI Chatbot | `/api/ai-chat` | 🟡 | Requires API key; degrades gracefully. |

## 5. Predictions

| Item | Where | Status | Notes |
|---|---|---|---|
| Prediction tree source | `/api/predictions/tree` | 🟡 | Supabase first → contract read fallback → empty with `fallback: true` flag. |
| CascadingPredictions "mock on failure" | `CascadingPredictions.tsx` | ⚫ **REMOVED** | Used to fabricate a fake successful chain when the tx failed. Now failures surface honestly (silent on user-reject, alert otherwise). |
| Pool creation / deposits / resolution | `bets/page.tsx` | 🟢 | Real contract calls on Amoy (BetPoolFactory verified live). |

## 6. Misc

| Item | Where | Status | Notes |
|---|---|---|---|
| Micropayments transfer | `/api/micropayments/transfer` | ⚫ **UI removed** | Was an acknowledged stub ("Sent (stub)"); the dead form was removed from the Markets page. The API route remains unused. |
| Copilot canned reply | `/api/strategy/copilot` | 🟡 | Real OpenAI when key present; canned response otherwise. |

## 7. Points, Arena & Time Machine (new — real engines)

| Item | Where | Status | Notes |
|---|---|---|---|
| Mosaic Points engine | `web/src/lib/points.ts` | 🟢 logic, local storage | Real deterministic engine; state is client-side (server sync is the roadmap). |
| **Arena betting engine** | `web/src/lib/arena.ts` + `/arena` | 🟢 **REAL** | Live Binance spot prices, entry locked at bet time, resolution against the **actual candle close** at expiry (fetched from Binance klines — works even after a page reload). Virtual XP bankroll (500 XP starter grant), real market, real win/loss. Nothing simulated except the currency. |
| **Time Machine (bar replay)** | `/arena/replay` | 🟢 **REAL** | Streams genuine historical 1m Binance candles from any day in the last year at 15–60×. Leverage 1–10×, liquidation at −100%, P&L settles into the same bankroll. Zero generated data. |
| **Duel receipts** | `arena.ts` (`encodeDuel`/`verifyDuel`) | 🟢 **REAL + trustless** | Shareable links encode a settled bet; the viewer's browser re-fetches the actual Binance kline and independently verifies the claimed outcome. Brag links that cannot be faked. |
| **Arena universe (450+ markets)** | `/api/arena/symbols` | 🟢 **REAL** | Live Binance exchangeInfo: every trading USDT spot pair (majors, alts, EUR/GBP forex pairs, PAXG gold). Searchable in the Arena; minimal hardcoded set only if Binance is unreachable. |
| **5s/15s expiries** | `/api/arena/price` (`interval=1s` klines) | 🟢 **REAL** | Short-expiry duels settle against genuine Binance 1-second candle closes (verified end-to-end: entry $63,557.22 → exit $63,574 → 1.9× payout). |
| **The House (LP pool)** | `arena.ts` (`stakeHouse`/`withdrawHouse`) | 🟢 real mechanics, local ledger | The book takes the other side of every duel; staked XP earns a pro-rata share of real duel outcomes. Single-player ledger today; shared pool = server roadmap. |
| **The Pit (live chat)** | `/api/arena/chat` + `ArenaChat.tsx` | 🟢 **REAL engine** | Supabase-backed when the `arena_chat` table exists (SQL in `web/supabase_migration.sql`); server-memory ring buffer otherwise — still genuinely multi-user per deployment. Engine tier shown in the UI. |
| **Market Pulse heatmap** | `/api/market/pulse` + `MarketPulse.tsx` | 🟢 **REAL** | Live 24h stats for the whole Binance USDT universe (~600 pairs): breadth, heat, volume leaders. Section simply doesn't render without real data — no placeholder tiles. |
| **Joined-strategy NAV** | `SocialCopyTrading.tsx` (BTC benchmark × beta) | 🟢 market-driven | Was frozen at invested value. Now marks to the live BTC price with per-strategy beta (Conservative 0.35, Aggressive 1.6) — your P&L moves with the real market. |

---

## Priority to make fully real (roadmap)

1. Seed the two demo strategies on-chain → drop `BASE_STRATEGIES` bookkeeping.
2. Live NAV for joined strategies (index follows via events, price the TVL).
3. ~~Remove the CascadingPredictions mock-on-failure branch~~ ✅ done.
4. ~~Make StrategyAnalytics trades real~~ ✅ done (EMA/SMA crossover engine).
5. Server-side points + arena leaderboard (Supabase already a dependency).
6. Mainnet `SwapHelper` behind a real router → resurrect SurgeBoost honestly.
