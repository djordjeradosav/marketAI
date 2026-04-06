import { supabase } from './supabase'
import { useStore, Score } from '../store'

const TFS = ['5min', '15min', '1h', '4h', '1day']

type ScoreRow = Omit<Score, 'symbol' | 'category'>

export async function loadAllScores(): Promise<void> {
  const { data: pairs } = await supabase
    .from('pairs')
    .select('id, symbol, category')
    .eq('is_active', true)

  if (!pairs?.length) return

  const pairMap: Record<string, { symbol: string; category: string }> = {}
  pairs.forEach((p) => { pairMap[p.id] = p })

  const results = await Promise.all(
    TFS.map((tf) =>
      supabase
        .from('scores')
        .select(
          'pair_id,timeframe,score,trend,ema_score,rsi_score,news_score,' +
          'ema20,ema50,ema200,rsi,adx,macd_hist,scanned_at'
        )
        .eq('timeframe', tf)
        .order('scanned_at', { ascending: false })
        .limit(500)
    )
  )

  const { batchLoad } = useStore.getState()

  TFS.forEach((tf, i) => {
    const seen = new Set<string>()
    const rows: Score[] = []

    for (const r of ((results[i].data ?? []) as unknown as ScoreRow[])) {
      if (seen.has(r.pair_id)) continue
      seen.add(r.pair_id)
      const meta = pairMap[r.pair_id]
      if (!meta?.symbol) continue
      rows.push({ ...r, symbol: meta.symbol, category: meta.category })
    }

    batchLoad(rows, tf)
  })
}

export async function runScan(tf: string): Promise<void> {
  await supabase.functions.invoke('fast-scan', { body: { timeframe: tf } })
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export function trendColor(trend?: string): string {
  if (trend === 'bullish') return '#22c55e'
  if (trend === 'bearish') return '#ef4444'
  return '#7a99b0'
}