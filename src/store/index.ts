import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

export interface Score {
  pair_id:    string
  symbol:     string
  timeframe:  string
  score:      number
  trend:      'bullish' | 'bearish' | 'neutral'
  ema_score:  number
  rsi_score:  number
  news_score: number
  ema20:      number
  ema50:      number
  ema200:     number | null
  rsi:        number
  adx:        number
  macd_hist:  number
  scanned_at: string
  category:   string
}

// Store scores as a nested map: tf -> symbol -> Score
// NEVER call Object.values() inside a selector — it creates new refs
interface AppStore {
  user:        User | null
  authReady:   boolean
  activeTF:    string
  isScanning:  boolean
  lastScanAt:  string | null
  // scores[tf][symbol] = Score
  scores:      Record<string, Record<string, Score>>

  setUser:      (u: User | null) => void
  setAuthReady: (v: boolean) => void
  setActiveTF:  (tf: string) => void
  setScanning:  (v: boolean) => void

  // Get one score (convenience for screens)
  get: (sym: string, tf: string) => Score | undefined

  // Load a batch of scores for one timeframe
  batchLoad: (rows: Score[], tf: string) => void
}

export const useStore = create<AppStore>()((set, get) => ({
  user:        null,
  authReady:   false,
  activeTF:    '1h',
  isScanning:  false,
  lastScanAt:  null,
  scores:      {},

  setUser:      (user)      => set({ user }),
  setAuthReady: (authReady) => set({ authReady }),
  setActiveTF:  (activeTF)  => set({ activeTF }),
  setScanning:  (v)         => set((s) => ({
    isScanning: v,
    lastScanAt: v ? s.lastScanAt : new Date().toISOString(),
  })),

  get: (sym, tf) => get().scores[tf]?.[sym],

  batchLoad: (rows, tf) => set((s) => {
    const tfMap: Record<string, Score> = {}
    rows.forEach((r) => { if (r.symbol) tfMap[r.symbol] = r })
    return { scores: { ...s.scores, [tf]: tfMap } }
  }),
}))

// ── Stable selectors — call these from components ────────────────────────────
// Each returns a primitive or a stable reference

export const selActiveTF    = (s: AppStore) => s.activeTF
export const selLastScanAt  = (s: AppStore) => s.lastScanAt
export const selIsScanning  = (s: AppStore) => s.isScanning
export const selUser        = (s: AppStore) => s.user
export const selAuthReady   = (s: AppStore) => s.authReady

// Get one score — returns undefined or Score (stable if unchanged)
export const selScore = (tf: string, sym: string) =>
  (s: AppStore): Score | undefined => s.scores[tf]?.[sym]

// Get derived numbers — primitives, no array allocation in selector
export const selCounts = (tf: string) => (s: AppStore) => {
  const map = s.scores[tf] ?? {}
  let bull = 0, bear = 0, total = 0, sum = 0
  for (const sc of Object.values(map)) {
    total++
    sum += sc.score
    if (sc.trend === 'bullish') bull++
    if (sc.trend === 'bearish') bear++
  }
  return { total, bull, bear, avg: total > 0 ? (sum / total).toFixed(1) : '—' }
}

// Returns array of symbols sorted by deviation — memoised by string join
// We return a string and split it so the reference only changes when content changes
export const selSortedSymbols = (tf: string) => (s: AppStore): string => {
  const map = s.scores[tf] ?? {}
  return Object.values(map)
    .sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))
    .map((r) => r.symbol)
    .join(',')
}

export const selTopSymbols = (tf: string, trend: 'bullish' | 'bearish') =>
  (s: AppStore): string => {
    const map = s.scores[tf] ?? {}
    return Object.values(map)
      .filter((r) => r.trend === trend)
      .sort((a, b) => trend === 'bullish' ? b.score - a.score : a.score - b.score)
      .slice(0, 5)
      .map((r) => `${r.symbol}:${r.score.toFixed(0)}`)
      .join(',')
  }