import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useStore, selCounts, selLastScanAt, selIsScanning, selActiveTF, selSortedSymbols, selTopSymbols } from '../../src/store'
import { loadAllScores, timeAgo, trendColor } from '../../src/lib/data'
import { C, S, R } from '../../src/config/theme'

const W    = Dimensions.get('window').width
const CELL = (W - S.lg * 2 - 4 * 4) / 3

const TFS  = ['5min', '15min', '1h', '4h', '1day'] as const
const TFL  = { '5min':'5M','15min':'15M','1h':'1H','4h':'4H','1day':'1D' } as Record<string,string>

const FRIENDLY: Record<string,string> = {
  XAUUSD:'Gold', XAGUSD:'Silver', US30USD:'Dow',
  NAS100USD:'Nasdaq', SPX500USD:'S&P500', AUS200AUD:'ASX200',
  JP225USD:'Nikkei', UK100GBP:'FTSE', GER40EUR:'DAX',
}

const SESSIONS = [
  { name:'LON', s:8,  e:16 },
  { name:'NY',  s:13, e:21 },
  { name:'TYO', s:0,  e:9  },
  { name:'SYD', s:22, e:6  },
]

function isOpen(s: number, e: number): boolean {
  const h = new Date().getUTCHours() + new Date().getUTCMinutes() / 60
  return s < e ? h >= s && h < e : h >= s || h < e
}

// ── Stable selectors (return primitives or stable refs) ──────────────────────
// These avoid creating new array/object references on every render
function useActiveTF()    { return useStore(selActiveTF) }
function useSetActiveTF() { return useStore(st => st.setActiveTF) }
function useLastScanAt()  { return useStore(selLastScanAt) }
function useIsScanning()  { return useStore(selIsScanning) }

function useScoreCounts(tf: string) {
  return useStore(selCounts(tf))
}

function useSortedSymbols(tf: string) {
  const joined = useStore(selSortedSymbols(tf))
  return useMemo(() => (joined ? joined.split(',') : []), [joined])
}

function useTopSymbols(tf: string, trend: 'bullish' | 'bearish') {
  const joined = useStore(selTopSymbols(tf, trend))
  return useMemo(() => {
    if (!joined) return []
    return joined
      .split(',')
      .filter(Boolean)
      .map((entry) => {
        const [symbol, scoreStr] = entry.split(':')
        return { symbol, score: Number(scoreStr) }
      })
  }, [joined])
}

// ── PairCell reads its own score — no array needed ───────────────────────────
function PairCell({ sym }: { sym: string }) {
  const router = useRouter()
  const tf     = useActiveTF()
  // Selecting a single value by key — stable, no new reference
  const sc     = useStore(st => st.scores[tf]?.[sym])

  const v   = sc?.score ?? 50
  const col = trendColor(sc?.trend)
  const bg  = sc?.trend === 'bullish'
    ? `rgba(34,197,94,${Math.max(0.05, (v - 50) / 50 * 0.25)})`
    : sc?.trend === 'bearish'
    ? `rgba(239,68,68,${Math.max(0.05, (50 - v) / 50 * 0.25)})`
    : C.surface

  const disp = sym.length > 7
    ? sym.replace('USD','').replace('EUR','').replace('GBP','')
    : sym

  return (
    <TouchableOpacity
      style={[d.cell, { borderColor: col + '55', backgroundColor: bg }]}
      onPress={() => router.push(`/pair/${sym}`)}
      activeOpacity={0.75}
    >
      <Text style={d.cellSym} numberOfLines={1}>{disp}</Text>
      {FRIENDLY[sym]
        ? <Text style={d.cellName} numberOfLines={1}>{FRIENDLY[sym]}</Text>
        : null}
      <Text style={[d.cellScore, { color: col }]}>{sc ? v.toFixed(0) : '—'}</Text>
      <Text style={[d.cellTrend, { color: col }]}>
        {!sc ? '—' : sc.trend === 'bullish' ? '↑ Bull' : sc.trend === 'bearish' ? '↓ Bear' : '→ Neu'}
      </Text>
    </TouchableOpacity>
  )
}

// ── Leaderboard — router called once at top level ────────────────────────────
function LeaderSection({
  title, items, color,
}: { title: string; items: {symbol:string;score:number}[]; color: string }) {
  const router = useRouter()  // ← called at component top level, not in .map()
  return (
    <View style={[d.leaderCard, { borderColor: color + '40' }]}>
      <Text style={[d.leaderTitle, { color }]}>{title}</Text>
      {items.map((r, i) => (
        <TouchableOpacity
          key={r.symbol}
          style={d.leaderRow}
          onPress={() => router.push(`/pair/${r.symbol}`)}
        >
          <Text style={d.leaderRank}>{i + 1}</Text>
          <Text style={d.leaderSym} numberOfLines={1}>{r.symbol}</Text>
          <View style={d.leaderBarTrack}>
            <View style={[d.leaderBarFill, {
              width: `${r.score}%` as any,
              backgroundColor: color,
            }]} />
          </View>
          <Text style={[d.leaderScore, { color }]}>{r.score.toFixed(0)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router       = useRouter()
  const tf           = useActiveTF()
  const setTF        = useSetActiveTF()
  const lastScanAt   = useLastScanAt()
  const counts       = useScoreCounts(tf)
  const sortedSyms   = useSortedSymbols(tf)
  const bullTop      = useTopSymbols(tf, 'bullish')
  const bearTop      = useTopSymbols(tf, 'bearish')

  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAllScores().finally(() => setLoading(false))
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadAllScores()
    setRefreshing(false)
  }, [])

  const bullPct = counts.total > 0 ? Math.round(counts.bull / counts.total * 100) : 0
  const bearPct = counts.total > 0 ? Math.round(counts.bear / counts.total * 100) : 0

  if (loading) {
    return (
      <SafeAreaView style={[d.safe, { alignItems:'center', justifyContent:'center' }]}>
        <ActivityIndicator color={C.green} size="large" />
        <Text style={{ color:C.muted, marginTop:12 }}>Loading market data...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={d.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.green}
          />
        }
      >
        {/* Header */}
        <View style={d.header}>
          <View>
            <Text style={d.title}>TrendScan AI</Text>
            <Text style={d.sub}>
              {lastScanAt ? `Scanned ${timeAgo(lastScanAt)}` : 'Pull down to load'}
            </Text>
          </View>
          <View style={{ flexDirection:'row', gap:4, flexWrap:'wrap', maxWidth:160, justifyContent:'flex-end' }}>
            {SESSIONS.map(s => {
              const open = isOpen(s.s, s.e)
              return (
                <View key={s.name} style={[d.sessPill, { borderColor: open ? C.green : C.border }]}>
                  <View style={{ width:5, height:5, borderRadius:3, backgroundColor: open ? C.green : C.dim }} />
                  <Text style={{ fontSize:9, fontWeight:'600', color: open ? C.green : C.muted }}>
                    {s.name}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* TF Switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal:S.lg, gap:6, paddingBottom:S.md }}>
          {TFS.map(t => (
            <TouchableOpacity key={t}
              style={[d.tfPill, tf === t && d.tfPillActive]}
              onPress={() => setTF(t)}>
              <Text style={[d.tfLabel, tf === t && d.tfLabelActive]}>{TFL[t]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stat Cards */}
        <View style={d.statRow}>
          {[
            { label:'Total',   val: String(counts.total), col: C.blue  },
            { label:'Bullish', val: String(counts.bull),  col: C.green },
            { label:'Bearish', val: String(counts.bear),  col: C.red   },
            { label:'Avg',     val: counts.avg,            col: C.amber },
          ].map(s => (
            <View key={s.label} style={d.statCard}>
              <Text style={d.statLabel}>{s.label}</Text>
              <Text style={[d.statVal, { color: s.col }]}>{s.val}</Text>
            </View>
          ))}
        </View>

        {/* Market Pulse */}
        {counts.total > 0 && (
          <View style={d.pulseWrap}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
              <Text style={d.pulseTitle}>Market Pulse — {counts.total} pairs</Text>
              <Text style={{ fontSize:11, color:C.muted }}>
                <Text style={{ color:C.green }}>{bullPct}% Bull</Text>
                {'  '}
                <Text style={{ color:C.red }}>{bearPct}% Bear</Text>
              </Text>
            </View>
            <View style={{ flexDirection:'row', height:6, borderRadius:3, overflow:'hidden', gap:1 }}>
              <View style={{ flex: counts.bull  || 0.01, backgroundColor: C.green }} />
              <View style={{ flex: (counts.total - counts.bull - counts.bear) || 0.01, backgroundColor: C.border }} />
              <View style={{ flex: counts.bear  || 0.01, backgroundColor: C.red }} />
            </View>
          </View>
        )}

        {/* Heatmap */}
        <View style={{ paddingHorizontal:S.md, marginTop:S.md }}>
          <Text style={d.sectionTitle}>Market Heatmap — {TFL[tf]}</Text>
          {sortedSyms.length === 0 ? (
            <View style={{ padding:S.xl, alignItems:'center' }}>
              <Text style={{ color:C.muted, fontSize:13, textAlign:'center' }}>
                No data yet.{'\n'}Go to Scanner → tap ⚡ Scan All
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
              {sortedSyms.map(sym => (
                <PairCell key={sym} sym={sym} />
              ))}
            </View>
          )}
        </View>

        {/* Leaderboards */}
        {(bullTop.length > 0 || bearTop.length > 0) && (
          <View style={{ flexDirection:'row', gap:8, paddingHorizontal:S.lg, marginTop:S.md }}>
            <LeaderSection title="↑ Strongest" items={bullTop} color={C.green} />
            <LeaderSection title="↓ Weakest"   items={bearTop} color={C.red}   />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const d = StyleSheet.create({
  safe:         { flex:1, backgroundColor:C.bg },
  header:       { flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', padding:S.lg, paddingTop:S.md },
  title:        { fontSize:22, fontWeight:'700', color:C.text },
  sub:          { fontSize:11, color:C.muted, marginTop:2 },
  sessPill:     { flexDirection:'row', alignItems:'center', gap:3, paddingHorizontal:6, paddingVertical:3, borderRadius:R.full, borderWidth:0.5 },
  tfPill:       { paddingHorizontal:14, paddingVertical:7, borderRadius:R.full, borderWidth:0.5, borderColor:C.border, backgroundColor:C.surface },
  tfPillActive: { backgroundColor:'rgba(34,197,94,0.12)', borderColor:C.green },
  tfLabel:      { fontSize:12, fontWeight:'600', color:C.muted },
  tfLabelActive:{ color:C.green },
  statRow:      { flexDirection:'row', gap:8, paddingHorizontal:S.lg, marginBottom:S.md },
  statCard:     { flex:1, backgroundColor:C.surface, borderRadius:R.md, padding:S.sm, alignItems:'center', borderWidth:0.5, borderColor:C.border },
  statLabel:    { fontSize:9, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 },
  statVal:      { fontSize:18, fontWeight:'700' },
  pulseWrap:    { marginHorizontal:S.lg, backgroundColor:C.surface, borderRadius:R.md, padding:S.md, marginBottom:S.md, borderWidth:0.5, borderColor:C.border },
  pulseTitle:   { fontSize:12, fontWeight:'500', color:C.muted },
  sectionTitle: { fontSize:11, fontWeight:'600', color:C.muted, textTransform:'uppercase', letterSpacing:0.8, paddingHorizontal:S.sm, marginBottom:S.sm },
  cell:         { width:CELL, margin:4, padding:S.sm, borderRadius:R.md, borderWidth:0.5, alignItems:'center', minHeight:76, justifyContent:'center' },
  cellSym:      { fontSize:10, fontWeight:'700', color:C.text },
  cellName:     { fontSize:8, color:C.muted, marginTop:1 },
  cellScore:    { fontSize:20, fontWeight:'700', marginTop:2 },
  cellTrend:    { fontSize:9, fontWeight:'500', marginTop:1 },
  leaderCard:   { flex:1, backgroundColor:C.surface, borderRadius:R.lg, padding:S.md, borderWidth:0.5 },
  leaderTitle:  { fontSize:12, fontWeight:'700', marginBottom:S.sm },
  leaderRow:    { flexDirection:'row', alignItems:'center', gap:4, marginBottom:6 },
  leaderRank:   { fontSize:9, color:C.dim, width:12 },
  leaderSym:    { fontSize:9, fontWeight:'600', color:C.text, width:52 },
  leaderBarTrack:{ flex:1, height:3, backgroundColor:C.border, borderRadius:2, overflow:'hidden' },
  leaderBarFill: { height:3, borderRadius:2 },
  leaderScore:  { fontSize:11, fontWeight:'700', width:22, textAlign:'right' },
})