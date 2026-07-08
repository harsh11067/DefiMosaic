"use client";

import { awardPoints } from "./points";

/**
 * The Arena — real-market paper trading engine.
 *
 * REAL: prices (Binance spot), entry locked at bet time, settlement against the
 * actual market price at expiry (live tick, or the historical 1m kline close if
 * the page was closed). Win/loss is decided purely by real market movement.
 *
 * VIRTUAL: the currency. New users get a one-time 500 XP bankroll so they can
 * feel a real position — the adrenaline is real, the downside isn't.
 *
 * Payout math (transparent, fixed): WIN returns stake × 1.9 (stake + 90% profit).
 * LOSS forfeits the stake. A dead-even price at expiry is a PUSH (stake refunded).
 */

export type Direction = "long" | "short";
export type BetStatus = "open" | "won" | "lost" | "push";

export const PAYOUT_MULTIPLIER = 1.9;
export const STARTER_BANKROLL = 500;
export const MIN_STAKE = 10;

export const ARENA_ASSETS = [
  { symbol: "BTCUSDT", asset: "BTC", name: "Bitcoin", color: "#f7931a" },
  { symbol: "ETHUSDT", asset: "ETH", name: "Ethereum", color: "#8b9dfc" },
  { symbol: "SOLUSDT", asset: "SOL", name: "Solana", color: "#14f195" },
  { symbol: "POLUSDT", asset: "POL", name: "Polygon", color: "#8247e5" },
] as const;

export const DURATIONS = [
  { label: "5s", ms: 5_000 },
  { label: "15s", ms: 15_000 },
  { label: "30s", ms: 30_000 },
  { label: "1m", ms: 60_000 },
  { label: "3m", ms: 180_000 },
  { label: "5m", ms: 300_000 },
] as const;

export interface ArenaBet {
  id: string;
  symbol: string;
  asset: string;
  direction: Direction;
  stake: number;
  entryPrice: number;
  placedAt: number;
  expiresAt: number;
  status: BetStatus;
  exitPrice?: number;
  payout?: number;
  settledAt?: number;
}

export interface ArenaStats {
  wins: number;
  losses: number;
  pushes: number;
  wagered: number;
  biggestWin: number;
  currentStreak: number;
  bestStreak: number;
}

export interface HouseState {
  staked: number; // user's XP staked as house liquidity
  earnings: number; // accrued share of house P&L (can be negative)
  settledCount: number; // duels this stake has underwritten
}

export interface ArenaState {
  balance: number;
  seeded: boolean;
  bets: ArenaBet[];
  stats: ArenaStats;
  house: HouseState;
}

/**
 * The House — become the liquidity.
 * The protocol's base book underwrites every duel; users can stake XP
 * alongside it and earn a pro-rata share of the house edge. On every
 * settlement: player loses -> house wins the stake; player wins -> house
 * pays the profit. Staker share = staked / (staked + HOUSE_BASE_LIQUIDITY).
 */
export const HOUSE_BASE_LIQUIDITY = 10_000;
export const MIN_HOUSE_STAKE = 50;

const LS_KEY = "mosaicArena";
const EVENT = "mosaic:arena";
const MAX_HISTORY = 50;

const DEFAULT_STATS: ArenaStats = {
  wins: 0,
  losses: 0,
  pushes: 0,
  wagered: 0,
  biggestWin: 0,
  currentStreak: 0,
  bestStreak: 0,
};

const DEFAULT_HOUSE: HouseState = { staked: 0, earnings: 0, settledCount: 0 };

const DEFAULT_STATE: ArenaState = {
  balance: 0,
  seeded: false,
  bets: [],
  stats: { ...DEFAULT_STATS },
  house: { ...DEFAULT_HOUSE },
};

function save(state: ArenaState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: state }));
  } catch (e) {
    console.warn("Failed to persist arena state:", e);
  }
}

/** Load state; grants the one-time 500 XP starter bankroll on first visit. */
export function loadArena(): ArenaState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  let state: ArenaState;
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    state = {
      ...DEFAULT_STATE,
      ...parsed,
      stats: { ...DEFAULT_STATS, ...(parsed.stats || {}) },
      house: { ...DEFAULT_HOUSE, ...(parsed.house || {}) },
    };
  } catch {
    state = { ...DEFAULT_STATE, stats: { ...DEFAULT_STATS }, house: { ...DEFAULT_HOUSE } };
  }
  if (!state.seeded) {
    state.seeded = true;
    state.balance = STARTER_BANKROLL;
    save(state);
  }
  return state;
}

export function onArenaChange(handler: (state: ArenaState) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail as ArenaState);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

/** Place a bet: deducts stake, locks the given live entry price. */
export function placeBet(params: {
  symbol: string;
  asset: string;
  direction: Direction;
  stake: number;
  entryPrice: number;
  durationMs: number;
}): { ok: true; bet: ArenaBet } | { ok: false; error: string } {
  const state = loadArena();
  const stake = Math.floor(params.stake);

  if (!Number.isFinite(stake) || stake < MIN_STAKE) {
    return { ok: false, error: `Minimum stake is ${MIN_STAKE} XP` };
  }
  if (stake > state.balance) {
    return { ok: false, error: `Insufficient bankroll (${state.balance} XP available)` };
  }
  if (!Number.isFinite(params.entryPrice) || params.entryPrice <= 0) {
    return { ok: false, error: "No live price — try again in a second" };
  }

  const now = Date.now();
  const bet: ArenaBet = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    symbol: params.symbol,
    asset: params.asset,
    direction: params.direction,
    stake,
    entryPrice: params.entryPrice,
    placedAt: now,
    expiresAt: now + params.durationMs,
    status: "open",
  };

  state.balance -= stake;
  state.stats.wagered += stake;
  state.bets = [bet, ...state.bets].slice(0, MAX_HISTORY);
  save(state);
  awardPoints("arena_bet");
  return { ok: true, bet };
}

/** Settle a single bet against a real exit price (house takes the other side). */
function settle(state: ArenaState, bet: ArenaBet, exitPrice: number) {
  bet.exitPrice = exitPrice;
  bet.settledAt = Date.now();

  const wentUp = exitPrice > bet.entryPrice;
  const wentDown = exitPrice < bet.entryPrice;
  let houseDelta = 0; // house P&L on this duel

  if ((bet.direction === "long" && wentUp) || (bet.direction === "short" && wentDown)) {
    bet.status = "won";
    bet.payout = Math.floor(bet.stake * PAYOUT_MULTIPLIER);
    state.balance += bet.payout;
    houseDelta = -(bet.payout - bet.stake); // house pays the profit
    state.stats.wins += 1;
    state.stats.currentStreak = Math.max(1, state.stats.currentStreak + 1);
    state.stats.bestStreak = Math.max(state.stats.bestStreak, state.stats.currentStreak);
    state.stats.biggestWin = Math.max(state.stats.biggestWin, bet.payout - bet.stake);
    awardPoints("arena_win");
  } else if (wentUp || wentDown) {
    bet.status = "lost";
    bet.payout = 0;
    houseDelta = bet.stake; // house keeps the stake
    state.stats.losses += 1;
    state.stats.currentStreak = Math.min(-1, state.stats.currentStreak - 1);
  } else {
    bet.status = "push";
    bet.payout = bet.stake; // refund, house flat
    state.balance += bet.stake;
    state.stats.pushes += 1;
  }

  // Staked house liquidity earns its pro-rata share of the duel
  if (state.house.staked > 0 && houseDelta !== 0) {
    const share = state.house.staked / (state.house.staked + HOUSE_BASE_LIQUIDITY);
    state.house.earnings += houseDelta * share;
    state.house.settledCount += 1;
  }
}

async function fetchPriceAt(symbol: string, ts: number): Promise<number | null> {
  try {
    const r = await fetch(`/api/arena/price?symbol=${symbol}&ts=${ts}`);
    if (!r.ok) return null;
    const data = await r.json();
    return Number.isFinite(data.price) ? data.price : null;
  } catch {
    return null;
  }
}

/**
 * Resolve all expired open bets against real market prices.
 * Returns the freshly settled bets (empty array if none).
 */
export async function resolveDueBets(): Promise<ArenaBet[]> {
  const state = loadArena();
  const now = Date.now();
  const due = state.bets.filter((b) => b.status === "open" && now >= b.expiresAt);
  if (due.length === 0) return [];

  const settled: ArenaBet[] = [];
  for (const bet of due) {
    const exit = await fetchPriceAt(bet.symbol, bet.expiresAt);
    if (exit === null) continue; // keep open; retried on next tick
    settle(state, bet, exit);
    settled.push(bet);
  }
  if (settled.length > 0) save(state);
  return settled;
}

/** Rebuy: if the bankroll is fully busted (no open bets), refill a fresh 500. */
export function rebuy(): ArenaState | null {
  const state = loadArena();
  const hasOpen = state.bets.some((b) => b.status === "open");
  if (state.balance >= MIN_STAKE || hasOpen) return null;
  state.balance += STARTER_BANKROLL;
  save(state);
  return state;
}

// ---------- The House: stake / withdraw ----------

/** Stake XP from the bankroll into house liquidity. */
export function stakeHouse(amount: number): { ok: boolean; error?: string } {
  const state = loadArena();
  const amt = Math.floor(amount);
  if (!Number.isFinite(amt) || amt < MIN_HOUSE_STAKE) {
    return { ok: false, error: `Minimum house stake is ${MIN_HOUSE_STAKE} XP` };
  }
  if (amt > state.balance) {
    return { ok: false, error: `Insufficient bankroll (${state.balance} XP available)` };
  }
  state.balance -= amt;
  state.house.staked += amt;
  save(state);
  return { ok: true };
}

/** Withdraw the full house position: stake + accrued earnings (floored at 0). */
export function withdrawHouse(): { ok: boolean; returned: number } {
  const state = loadArena();
  if (state.house.staked <= 0) return { ok: false, returned: 0 };
  const returned = Math.max(0, Math.round(state.house.staked + state.house.earnings));
  state.balance += returned;
  state.house = { staked: 0, earnings: 0, settledCount: 0 };
  save(state);
  return { ok: true, returned };
}

// ---------- Shared bankroll access (Time Machine trades from the same stack) ----------

/** Deduct from the bankroll (e.g. opening a Time Machine position). */
export function debitBankroll(amount: number): { ok: boolean; balance: number } {
  const state = loadArena();
  const amt = Math.floor(amount);
  if (!Number.isFinite(amt) || amt <= 0 || amt > state.balance) {
    return { ok: false, balance: state.balance };
  }
  state.balance -= amt;
  save(state);
  return { ok: true, balance: state.balance };
}

/** Credit the bankroll (e.g. closing a Time Machine position). */
export function creditBankroll(amount: number): number {
  const state = loadArena();
  const amt = Math.max(0, Math.floor(amount));
  state.balance += amt;
  save(state);
  return state.balance;
}

// ---------- Duel receipts: shareable, trustlessly re-verifiable ----------

export interface DuelReceipt {
  v: 1;
  symbol: string;
  asset: string;
  direction: Direction;
  stake: number;
  entryPrice: number;
  exitPrice: number;
  placedAt: number;
  expiresAt: number;
  status: BetStatus;
}

/** Encode a settled bet as a URL-safe receipt token. */
export function encodeDuel(bet: ArenaBet): string | null {
  if (bet.status === "open" || bet.exitPrice === undefined) return null;
  const receipt: DuelReceipt = {
    v: 1,
    symbol: bet.symbol,
    asset: bet.asset,
    direction: bet.direction,
    stake: bet.stake,
    entryPrice: bet.entryPrice,
    exitPrice: bet.exitPrice,
    placedAt: bet.placedAt,
    expiresAt: bet.expiresAt,
    status: bet.status,
  };
  try {
    const json = JSON.stringify(receipt);
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch {
    return null;
  }
}

export function decodeDuel(token: string): DuelReceipt | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const r = JSON.parse(json);
    if (
      r?.v !== 1 ||
      typeof r.symbol !== "string" ||
      !["long", "short"].includes(r.direction) ||
      !Number.isFinite(r.entryPrice) ||
      !Number.isFinite(r.exitPrice) ||
      !Number.isFinite(r.expiresAt)
    ) {
      return null;
    }
    return r as DuelReceipt;
  } catch {
    return null;
  }
}

/**
 * Trustless verification: recompute the duel's exit against the public Binance
 * kline for the expiry minute. Anyone's browser can check the receipt — a brag
 * link that cannot be faked.
 */
export async function verifyDuel(receipt: DuelReceipt): Promise<{
  verified: boolean;
  marketExit: number | null;
  outcomeMatches: boolean;
}> {
  const marketExit = await (async () => {
    try {
      const r = await fetch(`/api/arena/price?symbol=${receipt.symbol}&ts=${receipt.expiresAt}`);
      if (!r.ok) return null;
      const data = await r.json();
      return Number.isFinite(data.price) ? (data.price as number) : null;
    } catch {
      return null;
    }
  })();

  if (marketExit === null) return { verified: false, marketExit: null, outcomeMatches: false };

  // The recorded exit was a live tick inside the expiry minute; the kline close
  // is the settled market print for that minute. Accept a small drift band and,
  // decisively, require the claimed WIN/LOSS to match the real market direction.
  const drift = Math.abs(marketExit - receipt.exitPrice) / marketExit;
  const marketSaysWon =
    (receipt.direction === "long" && marketExit > receipt.entryPrice) ||
    (receipt.direction === "short" && marketExit < receipt.entryPrice);
  const claimedWon = receipt.status === "won";
  const outcomeMatches = marketSaysWon === claimedWon || receipt.status === "push";

  return { verified: drift < 0.02 && outcomeMatches, marketExit, outcomeMatches };
}
