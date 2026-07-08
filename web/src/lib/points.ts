"use client";

/**
 * Mosaic Points — client-side gamified rewards engine.
 *
 * Every meaningful protocol action earns XP. Levels, tiers, daily streaks and
 * quests are derived from a single localStorage record, and a window event
 * ("mosaic:points") lets any component re-render live when XP changes.
 *
 * This is the retention/monetization layer (points meta) and the on-ramp to
 * SaaS tiers: Free users earn points, Pro unlocks multipliers + analytics.
 */

export type PointsAction =
  | "daily_login"
  | "follow_strategy"
  | "create_strategy"
  | "arena_bet"
  | "arena_win"
  | "create_pool"
  | "create_prediction"
  | "run_recommendation";

export const ACTION_REWARDS: Record<PointsAction, { xp: number; label: string; emoji: string }> = {
  daily_login: { xp: 25, label: "Daily check-in", emoji: "🔥" },
  follow_strategy: { xp: 120, label: "Follow a strategy", emoji: "🤝" },
  create_strategy: { xp: 200, label: "Create a strategy", emoji: "🧠" },
  arena_bet: { xp: 30, label: "Enter the Arena", emoji: "⚔️" },
  arena_win: { xp: 60, label: "Win an Arena duel", emoji: "🏆" },
  create_pool: { xp: 150, label: "Create a prediction pool", emoji: "🎯" },
  create_prediction: { xp: 150, label: "Chain a prediction", emoji: "🔗" },
  run_recommendation: { xp: 40, label: "Run an AI recommendation", emoji: "✨" },
};

export interface PointsActivity {
  action: PointsAction;
  xp: number;
  at: number; // epoch ms
}

export interface PointsState {
  xp: number;
  streakDays: number;
  lastLoginDay: string; // YYYY-MM-DD
  counts: Partial<Record<PointsAction, number>>;
  activity: PointsActivity[]; // most recent first, capped
}

export interface TierInfo {
  name: string;
  emoji: string;
  minLevel: number;
  color: string;
}

export const TIERS: TierInfo[] = [
  { name: "Bronze", emoji: "🥉", minLevel: 1, color: "#cd7f32" },
  { name: "Silver", emoji: "🥈", minLevel: 3, color: "#c0c0c0" },
  { name: "Gold", emoji: "🥇", minLevel: 6, color: "#fbbf24" },
  { name: "Platinum", emoji: "💠", minLevel: 10, color: "#38bdf8" },
  { name: "Diamond", emoji: "💎", minLevel: 15, color: "#a78bfa" },
];

const LS_KEY = "mosaicPoints";
const EVENT = "mosaic:points";
const MAX_ACTIVITY = 20;

const DEFAULT_STATE: PointsState = {
  xp: 0,
  streakDays: 0,
  lastLoginDay: "",
  counts: {},
  activity: [],
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadPoints(): PointsState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

function save(state: PointsState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: state }));
  } catch (e) {
    console.warn("Failed to persist Mosaic Points:", e);
  }
}

/** Award XP for an action. Returns the new state. */
export function awardPoints(action: PointsAction): PointsState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const state = loadPoints();
  const reward = ACTION_REWARDS[action];
  if (!reward) return state;

  // Daily login only counts once per calendar day, and maintains the streak
  if (action === "daily_login") {
    const today = todayKey();
    if (state.lastLoginDay === today) return state;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    state.streakDays = state.lastLoginDay === yesterday ? state.streakDays + 1 : 1;
    state.lastLoginDay = today;
  }

  state.xp += reward.xp;
  state.counts[action] = (state.counts[action] ?? 0) + 1;
  state.activity = [{ action, xp: reward.xp, at: Date.now() }, ...state.activity].slice(0, MAX_ACTIVITY);
  save(state);
  return state;
}

/** Level curve: each level needs 250 * level XP (level 1 → 2 needs 250, 2 → 3 needs 500 …) */
export function levelFromXp(xp: number): { level: number; intoLevel: number; needed: number } {
  let level = 1;
  let remaining = xp;
  while (remaining >= 250 * level) {
    remaining -= 250 * level;
    level += 1;
  }
  return { level, intoLevel: remaining, needed: 250 * level };
}

export function tierForLevel(level: number): TierInfo {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (level >= t.minLevel) tier = t;
  }
  return tier;
}

/** Subscribe to live point changes. Returns an unsubscribe function. */
export function onPointsChange(handler: (state: PointsState) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent).detail as PointsState);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export interface Quest {
  action: PointsAction;
  title: string;
  emoji: string;
  xp: number;
  done: boolean;
}

/** Quest list derived from lifetime action counts (first completion each). */
export function questsFromState(state: PointsState): Quest[] {
  const order: PointsAction[] = [
    "daily_login",
    "run_recommendation",
    "arena_bet",
    "arena_win",
    "follow_strategy",
    "create_strategy",
    "create_pool",
    "create_prediction",
  ];
  return order.map((action) => ({
    action,
    title: ACTION_REWARDS[action].label,
    emoji: ACTION_REWARDS[action].emoji,
    xp: ACTION_REWARDS[action].xp,
    done: (state.counts[action] ?? 0) > 0,
  }));
}
