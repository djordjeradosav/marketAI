
import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useStore, selActiveTF, selScore, Score } from '../../src/store'
import { loadAllScores, runScan, timeAgo, trendColor } from '../../src/lib/data'
import { C, S, R } from '../../src/config/theme'

const TFS = ['5min','15min','1h','4h','1day']
const TFL: Record<string,string> = {'5min':'5M','15min':'15M','1h':'1H','4h':'4H','1day':'1D'}
const CATS = ['All','Forex','Futures','Commodity']

function Card({ item, onPress }: { item: Score; onPress: () => void }) {
  const col = trendColor(item.trend)
  const bg  = item.trend==='bullish'?'rgba(34,197,94,0.07)'
            : item.trend==='bearish'?'rgba(239,68,68,0.07)':C.surface
  return (
    <TouchableOpacity style={[sc.card,{borderColor:col+'40',backgroundColor:bg}]}
      onPress={onPress} activeOpacity={0.75}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'}}>
        <View style={{flex:1}}>
          <Text style={sc.sym}>{item.symbol}</Text>
          <Text style={sc.cat}>{item.category}</Text>
        </View>
        <View style={{alignItems:'flex-end'}}>
          <Text style={[sc.score,{color:col}]}>{item.score.toFixed(0)}</Text>
          <View style={[sc.badge,{backgroundColor:item.trend==='bullish'?C.greenBg:item.trend==='bearish'?C.redBg:'#1a1a1a'}]}>
            <Text style={[sc.badgeText,{color:col}]}>
              {item.trend==='bullish'?'↑ BULL':item.trend==='bearish'?'↓ BEAR':'→ NEU'}
            </Text>
          </View>
        </View>
      </View>
      <View style={{height:3,backgroundColor:C.border,borderRadius:2,overflow:'hidden',marginTop:8}}>
        <View style={{width:`${item.score}%` as any,height:3,backgroundColor:col,borderRadius:2}}/>
      </View>
      <View style={{flexDirection:'row',gap:12,marginTop:6}}>
        <Text style={sc.ind}>RSI <Text style={{color:(item.rsi??50)>70?C.red:(item.rsi??50)<30?C.green:C.muted}}>
          {item.rsi?.toFixed(1)??'—'}</Text></Text>
        <Text style={sc.ind}>ADX <Text style={{color:(item.adx??0)>25?C.green:C.muted}}>
          {item.adx?.toFixed(1)??'—'}</Text></Text>
        <Text style={sc.ind}>EMA <Text style={{color:(item.ema20??0)>(item.ema50??0)?C.green:C.red}}>
          {(item.ema20??0)>(item.ema50??0)?'↑ Aligned':'↓ Inverse'}</Text></Text>
      </View>
    </TouchableOpacity>
  )
}

export default function Scanner() {
  const router     = useRouter()
  const tf         = useStore(selActiveTF)
  const setTF      = useStore((s) => s.setActiveTF)
  const isScanning = useStore((s) => s.isScanning)
  const lastScanAt = useStore((s) => s.lastScanAt)
  const setScanning= useStore((s) => s.setScanning)

  // Read all scores for current TF as a flat list
  // Safe: we do this in useState/memo, not in a selector
  const scoresMap  = useStore((s) => s.scores[tf] ?? {})

  const [search,    setSearch]    = useState('')
  const [cat,       setCat]       = useState('All')
  const [progress,  setProgress]  = useState<Record<string,string>>({})
  const [refreshing,setRefreshing]= useState(false)

  useEffect(() => {
    if (Object.keys(scoresMap).length === 0) loadAllScores()
  }, [])

  const allRows = Object.values(scoresMap)
  const filtered = allRows
    .filter((r) => cat==='All' || r.category.toLowerCase()===cat.toLowerCase())
    .filter((r) => !search || r.symbol.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Math.abs(b.score-50)-Math.abs(a.score-50))

  const bull = allRows.filter((r) => r.trend==='bullish').length
  const bear = allRows.filter((r) => r.trend==='bearish').length
  const avg  = allRows.length
    ? (allRows.reduce((a,b)=>a+b.score,0)/allRows.length).toFixed(1) : '—'

  async function scanAll() {
    if (isScanning) return
    setScanning(true)
    const init: Record<string,string> = {}
    TFS.forEach((t) => { init[t]='pending' })
    setProgress({ ...init })

    await Promise.allSettled(TFS.map(async (t) => {
      setProgress((p) => ({...p,[t]:'scanning'}))
      try {
        await runScan(t)
        setProgress((p) => ({...p,[t]:'done'}))
      } catch {
        setProgress((p) => ({...p,[t]:'error'}))
      }
    }))

    await loadAllScores()
    setScanning(false)
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadAllScores()
    setRefreshing(false)
  }, [])

  return (
    <SafeAreaView style={sc.safe} edges={['top']}>
      {/* Header */}
      <View style={sc.header}>
        <View>
          <Text style={sc.title}>Scanner</Text>
          {lastScanAt&&<Text style={{fontSize:11,color:C.muted}}>
            {timeAgo(lastScanAt)}</Text>}
        </View>
        <TouchableOpacity style={[sc.scanBtn,isScanning&&{opacity:0.6}]}
          onPress={scanAll} disabled={isScanning}>
          {isScanning
            ? <ActivityIndicator color={C.green} size="small"/>
            : <Text style={sc.scanBtnText}>⚡ Scan All</Text>}
        </TouchableOpacity>
      </View>

      {/* Progress chips */}
      {isScanning && (
        <View style={{flexDirection:'row',gap:5,paddingHorizontal:S.lg,marginBottom:S.sm}}>
          {TFS.map((t) => {
            const st=progress[t]
            const c=st==='done'?C.green:st==='scanning'?C.amber:st==='error'?C.red:C.dim
            return (
              <View key={t} style={{paddingHorizontal:8,paddingVertical:3,
                borderRadius:R.full,borderWidth:0.5,borderColor:c}}>
                <Text style={{fontSize:10,fontWeight:'600',color:c}}>
                  {st==='done'?'✓ ':st==='scanning'?'⟳ ':''}{TFL[t]}
                </Text>
              </View>
            )
          })}
        </View>
      )}

      {/* TF selector */}
      <View style={{flexDirection:'row',gap:5,paddingHorizontal:S.lg,marginBottom:S.sm}}>
        {TFS.map((t) => (
          <TouchableOpacity key={t}
            style={[{paddingHorizontal:12,paddingVertical:6,borderRadius:R.full,
              borderWidth:0.5,borderColor:C.border},
              tf===t&&{backgroundColor:C.greenBg,borderColor:C.green}]}
            onPress={()=>setTF(t)}>
            <Text style={{fontSize:12,fontWeight:'600',
              color:tf===t?C.green:C.muted}}>{TFL[t]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats */}
      <View style={{flexDirection:'row',gap:6,paddingHorizontal:S.lg,marginBottom:S.sm}}>
        {[
          {l:'Total',v:String(allRows.length),c:C.blue},
          {l:'Bull',v:String(bull),c:C.green},
          {l:'Bear',v:String(bear),c:C.red},
          {l:'Avg',v:avg,c:C.amber},
        ].map((s) => (
          <View key={s.l} style={{flex:1,backgroundColor:C.surface,borderRadius:R.md,
            padding:S.sm,alignItems:'center',borderWidth:0.5,borderColor:C.border}}>
            <Text style={{fontSize:14,fontWeight:'700',color:s.c}}>{s.v}</Text>
            <Text style={{fontSize:9,color:C.muted}}>{s.l}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={{paddingHorizontal:S.lg,marginBottom:S.sm}}>
        <TextInput style={sc.search} value={search} onChangeText={setSearch}
          placeholder="Search pairs..." placeholderTextColor={C.dim}
          autoCapitalize="characters"/>
      </View>

      {/* Category filter */}
      <View style={{flexDirection:'row',gap:5,paddingHorizontal:S.lg,marginBottom:S.sm}}>
        {CATS.map((c) => (
          <TouchableOpacity key={c}
            style={[{paddingHorizontal:10,paddingVertical:4,borderRadius:R.full,
              borderWidth:0.5,borderColor:C.border},
              cat===c&&{backgroundColor:C.greenBg,borderColor:C.green}]}
            onPress={()=>setCat(c)}>
            <Text style={{fontSize:11,fontWeight:'500',
              color:cat===c?C.green:C.muted}}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.symbol}
        numColumns={2}
        contentContainerStyle={{paddingHorizontal:S.sm,paddingBottom:100}}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green}/>
        }
        renderItem={({item}) => (
          <Card item={item} onPress={()=>router.push(`/pair/${item.symbol}`)}/>
        )}
        ListEmptyComponent={
          <View style={{padding:S.xl,alignItems:'center'}}>
            <Text style={{color:C.muted,fontSize:13,textAlign:'center'}}>
              {allRows.length===0
                ? 'No data — tap ⚡ Scan All'
                : 'No pairs match your filters'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const sc = StyleSheet.create({
  safe:        {flex:1,backgroundColor:C.bg},
  header:      {flexDirection:'row',justifyContent:'space-between',alignItems:'center',
                paddingHorizontal:S.lg,paddingTop:S.md,paddingBottom:S.sm},
  title:       {fontSize:22,fontWeight:'700',color:C.text},
  scanBtn:     {backgroundColor:C.greenBg,paddingHorizontal:16,paddingVertical:9,
                borderRadius:R.full,borderWidth:1,borderColor:C.green,
                minWidth:100,alignItems:'center',flexDirection:'row',justifyContent:'center'},
  scanBtnText: {fontSize:13,fontWeight:'600',color:C.green},
  search:      {backgroundColor:C.surface,borderRadius:R.md,paddingHorizontal:12,
                paddingVertical:10,fontSize:13,color:C.text,borderWidth:0.5,borderColor:C.border},
  card:        {flex:1,margin:4,padding:S.md,borderRadius:R.lg,borderWidth:0.5},
  sym:         {fontSize:13,fontWeight:'700',color:C.text},
  cat:         {fontSize:9,color:C.dim,textTransform:'uppercase',letterSpacing:0.5,marginTop:1},
  score:       {fontSize:24,fontWeight:'700'},
  badge:       {paddingHorizontal:7,paddingVertical:2,borderRadius:4,marginTop:3},
  badgeText:   {fontSize:9,fontWeight:'700'},
  ind:         {fontSize:10,color:C.muted},
})