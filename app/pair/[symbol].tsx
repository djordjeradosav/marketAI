import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { useStore } from '../../src/store'
import { timeAgo, trendColor } from '../../src/lib/data'
import { C, S, R } from '../../src/config/theme'

const W   = Dimensions.get('window').width
const TFS = ['5min','15min','1h','4h','1day']
const TFL = {'5min':'5M','15min':'15M','1h':'1H','4h':'4H','1day':'1D'} as Record<string,string>
const NAMES: Record<string,string> = {
  EURUSD:'Euro / US Dollar', GBPUSD:'GBP / US Dollar', USDJPY:'USD / Japanese Yen',
  USDCHF:'USD / Swiss Franc', AUDUSD:'AUD / US Dollar', USDCAD:'USD / Canadian Dollar',
  NZDUSD:'NZD / US Dollar', XAUUSD:'Gold vs USD', XAGUSD:'Silver vs USD',
  US30USD:'Dow Jones 30', NAS100USD:'Nasdaq 100', SPX500USD:'S&P 500',
}

function Bar({label,val,max}:{label:string;val:number;max:number}) {
  const pct = Math.min(100,Math.max(0,(val/max)*100))
  const col = pct>=80?C.green:pct>=50?C.amber:C.red
  return (
    <View style={{marginBottom:10}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
        <Text style={{fontSize:11,color:C.muted}}>{label}</Text>
        <Text style={{fontSize:11,fontWeight:'600',color:col}}>{val.toFixed(0)}/{max}</Text>
      </View>
      <View style={{height:4,backgroundColor:C.border,borderRadius:2,overflow:'hidden'}}>
        <View style={{width:`${pct}%` as any,height:4,backgroundColor:col,borderRadius:2}}/>
      </View>
    </View>
  )
}

export default function PairDetail() {
  const {symbol}   = useLocalSearchParams<{symbol:string}>()
  const router     = useRouter()
  const [tf,setTF] = useState('1h')
  const [ai,setAI] = useState('')
  const [aiLoad,setAILoad] = useState(false)
  const [news,setNews] = useState<any[]>([])
  const getScore = useStore(s => s.get)
  const score    = useStore(s => s.get(symbol, tf))

  const col  = trendColor(score?.trend)
  const bg   = score?.trend==='bullish'?'rgba(34,197,94,0.08)':score?.trend==='bearish'?'rgba(239,68,68,0.08)':C.surface

  useEffect(() => {
    if (!symbol) return
    const base=symbol.slice(0,3), quote=symbol.slice(3,6)
    supabase.from('news_articles')
      .select('id,headline,source,url,published_at,sentiment')
      .or(`relevant_pairs.cs.{${symbol}},relevant_pairs.cs.{${base}},relevant_pairs.cs.{${quote}}`)
      .order('published_at',{ascending:false}).limit(5)
      .then(({data})=>setNews(data??[]))
  }, [symbol])

  const generateAI = useCallback(async () => {
    if (!score||aiLoad) return
    setAILoad(true)
    try {
      const {data} = await supabase.functions.invoke('analyze-pair', {
        body: {symbol,timeframe:tf,score:score.score,trend:score.trend,rsi:score.rsi,adx:score.adx,ema20:score.ema20,ema50:score.ema50}
      })
      if (data?.summary) setAI(data.summary)
    } catch {}
    setAILoad(false)
  }, [symbol,tf,score])

  useEffect(() => { setAI(''); if(score) generateAI() }, [symbol,tf])

  const aligned = TFS.filter(t => getScore(symbol,t)?.trend===score?.trend).length

  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.bg}} edges={['top']}>
      {/* Header */}
      <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:S.lg,paddingTop:S.md,paddingBottom:S.sm,gap:12}}>
        <TouchableOpacity onPress={()=>router.back()}>
          <Text style={{color:C.blue,fontSize:16}}>←</Text>
        </TouchableOpacity>
        <View style={[p.scoreCircle,{borderColor:col+'80',backgroundColor:bg}]}>
          <Text style={{fontSize:15,fontWeight:'700',color:col}}>{score?.score.toFixed(0)??'—'}</Text>
        </View>
        <View style={{flex:1}}>
          <Text style={{fontSize:20,fontWeight:'700',color:C.text}}>{symbol}</Text>
          <Text style={{fontSize:11,color:C.muted}}>{NAMES[symbol]??symbol}</Text>
        </View>
        <View style={{flexDirection:'row',gap:8}}>
          <View style={[p.hCard,{borderColor:col+'50'}]}>
            <Text style={{fontSize:9,color:C.dim,textTransform:'uppercase',letterSpacing:0.4,marginBottom:2}}>Bias</Text>
            <Text style={{fontSize:12,fontWeight:'600',color:col}}>
              {score?.trend==='bullish'?'Bullish':score?.trend==='bearish'?'Bearish':'Neutral'}
            </Text>
          </View>
          <View style={[p.hCard,{borderColor:C.border}]}>
            <Text style={{fontSize:9,color:C.dim,textTransform:'uppercase',letterSpacing:0.4,marginBottom:2}}>Align</Text>
            <Text style={{fontSize:12,fontWeight:'600',color:aligned>=4?C.green:aligned>=3?C.amber:C.muted}}>
              {aligned}/5 TFs
            </Text>
          </View>
        </View>
      </View>

      {/* TF Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal:S.lg,gap:4,paddingBottom:S.sm}}>
        {TFS.map(t=>{
          const s   = getScore(symbol,t)
          const c   = trendColor(s?.trend)
          const act = tf===t
          return (
            <TouchableOpacity key={t}
              style={[{paddingHorizontal:12,paddingVertical:6,borderRadius:R.full,borderWidth:0.5,borderColor:C.border,flexDirection:'row',alignItems:'center',gap:5},act&&{backgroundColor:c+'20',borderColor:c}]}
              onPress={()=>setTF(t)}>
              <Text style={{fontSize:12,fontWeight:'600',color:act?c:C.muted}}>{TFL[t]}</Text>
              {s&&<Text style={{fontSize:11,fontWeight:'700',color:c}}>{s.score.toFixed(0)}</Text>}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{paddingBottom:100}} showsVerticalScrollIndicator={false}>
        {!score ? (
          <View style={{padding:S.xl,alignItems:'center'}}>
            <Text style={{color:C.muted,fontSize:13,textAlign:'center'}}>
              No data for {TFL[tf]}.{'\n'}Go to Scanner and run a scan.
            </Text>
          </View>
        ) : (
          <>
            {/* AI Overview */}
            <View style={p.card}>
              <View style={{flexDirection:'row',alignItems:'center',gap:6,marginBottom:8}}>
                <Text style={{color:C.green,fontSize:14}}>✦</Text>
                <Text style={{fontSize:13,fontWeight:'600',color:C.green}}>AI Overview</Text>
                <Text style={{fontSize:10,color:C.dim,marginLeft:'auto' as any}}>{TFL[tf]} · {timeAgo(score.scanned_at)}</Text>
              </View>
              {aiLoad ? (
                <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                  <ActivityIndicator color={C.green} size="small"/>
                  <Text style={{color:C.muted,fontSize:12}}>Generating analysis...</Text>
                </View>
              ) : ai ? (
                <Text style={{fontSize:13,color:C.text,lineHeight:20}}>{ai}</Text>
              ) : (
                <TouchableOpacity style={{paddingVertical:8}} onPress={generateAI}>
                  <Text style={{fontSize:12,color:C.blue}}>Tap to generate AI analysis ↗</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Market conditions */}
            <View style={{flexDirection:'row',gap:8,paddingHorizontal:S.lg,marginBottom:S.md}}>
              {[
                {title:'Flow',    val:(score.adx??0)>30?'CROWDED':(score.adx??0)>20?'HEALTHY':'THIN',         col:(score.adx??0)>20?C.green:C.muted},
                {title:'Bearing', val:score.score>=62?'IMPULSE UP':score.score<=38?'IMPULSE DOWN':'CHOPPY',   col:score.score>=62?C.green:score.score<=38?C.red:C.amber},
                {title:'Pulse',   val:(score.adx??0)>25?'TRADABLE':(score.adx??0)>15?'MODERATE':'QUIET',      col:(score.adx??0)>25?C.green:C.muted},
              ].map(c=>(
                <View key={c.title} style={{flex:1,backgroundColor:C.surface,borderRadius:R.md,padding:S.sm,alignItems:'center',borderWidth:0.5,borderColor:C.border}}>
                  <Text style={{fontSize:10,color:C.muted,marginBottom:4}}>{c.title}</Text>
                  <Text style={{fontSize:10,fontWeight:'700',color:c.col,textAlign:'center'}}>{c.val}</Text>
                </View>
              ))}
            </View>

            {/* Score breakdown */}
            <View style={p.card}>
              <Text style={p.cardTitle}>Score Breakdown</Text>
              <View style={{marginTop:S.sm}}>
                <Bar label="EMA Alignment"  val={score.ema_score??0}  max={30}/>
                <Bar label="RSI Momentum"   val={score.rsi_score??0}  max={20}/>
                <Bar label="News Sentiment" val={score.news_score??7} max={12}/>
              </View>
              <View style={{height:1,backgroundColor:C.border,marginVertical:S.sm}}/>
              <View style={{flexDirection:'row',justifyContent:'space-between'}}>
                <Text style={{fontSize:12,fontWeight:'600',color:C.muted}}>TOTAL</Text>
                <Text style={{fontSize:14,fontWeight:'700',color:col}}>{score.score.toFixed(0)}/100</Text>
              </View>
            </View>

            {/* Indicators */}
            <View style={p.card}>
              <Text style={p.cardTitle}>Indicators — {TFL[tf]}</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:S.sm}}>
                {[
                  {label:'RSI',      val:score.rsi?.toFixed(1)??'—',     col:(score.rsi??50)>70?C.red:(score.rsi??50)<30?C.green:C.muted},
                  {label:'ADX',      val:score.adx?.toFixed(1)??'—',     col:(score.adx??0)>25?C.green:C.muted},
                  {label:'EMA 9',    val:score.ema20?.toFixed(5)??'—',   col},
                  {label:'EMA 21',   val:score.ema50?.toFixed(5)??'—',   col},
                  {label:'EMA 200',  val:score.ema200?.toFixed(4)??'N/A',col:score.ema200?col:C.dim},
                  {label:'MACD Hist',val:score.macd_hist?.toFixed(5)??'—',col:(score.macd_hist??0)>0?C.green:C.red},
                  {label:'Scanned',  val:timeAgo(score.scanned_at),       col:C.dim},
                  {label:'EMA Cross',val:(score.ema20??0)>(score.ema50??0)?'↑ Bullish':'↓ Bearish',col:(score.ema20??0)>(score.ema50??0)?C.green:C.red},
                ].map(ind=>(
                  <View key={ind.label} style={{width:(W-S.lg*2-S.md*2-18)/4,backgroundColor:C.elevated,borderRadius:R.sm,padding:S.sm}}>
                    <Text style={{fontSize:8,color:C.dim,textTransform:'uppercase',letterSpacing:0.3,marginBottom:2}}>{ind.label}</Text>
                    <Text style={{fontSize:10,fontWeight:'600',color:ind.col}} numberOfLines={1}>{ind.val}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* TF Alignment */}
            <View style={p.card}>
              <Text style={p.cardTitle}>Timeframe Alignment</Text>
              <View style={{flexDirection:'row',gap:6,marginTop:S.sm}}>
                {TFS.map(t=>{
                  const s  = getScore(symbol,t)
                  const c  = trendColor(s?.trend)
                  return (
                    <View key={t} style={{flex:1,borderRadius:R.md,borderWidth:0.5,borderColor:c+'60',backgroundColor:c+'10',padding:S.sm,alignItems:'center',gap:2}}>
                      <Text style={{fontSize:9,fontWeight:'600',color:c,letterSpacing:0.3}}>{TFL[t]}</Text>
                      <Text style={{fontSize:16,fontWeight:'700',color:c}}>{s?s.score.toFixed(0):'—'}</Text>
                      <Text style={{fontSize:14,color:c}}>{!s?'?':s.trend==='bullish'?'↑':s.trend==='bearish'?'↓':'→'}</Text>
                    </View>
                  )
                })}
              </View>
              <Text style={{fontSize:11,color:C.muted,marginTop:S.sm}}>
                {aligned>=4?`${aligned}/5 timeframes agree — strong ${score.trend}`:`${aligned}/5 TFs aligned — mixed signals`}
              </Text>
            </View>

            {/* News */}
            {news.length>0&&(
              <View style={p.card}>
                <Text style={p.cardTitle}>Recent News</Text>
                {news.map((a,i)=>{
                  const sc=a.sentiment==='positive'?C.green:a.sentiment==='negative'?C.red:C.muted
                  return (
                    <View key={a.id} style={[{paddingVertical:10},i<news.length-1&&{borderBottomWidth:0.5,borderBottomColor:C.border}]}>
                      <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:3}}>
                        <Text style={{fontSize:10,color:C.muted,fontWeight:'600'}}>{a.source?.toUpperCase()}</Text>
                        <View style={{flexDirection:'row',alignItems:'center',gap:4}}>
                          <View style={{width:5,height:5,borderRadius:3,backgroundColor:sc}}/>
                          <Text style={{fontSize:9,color:C.dim}}>{timeAgo(a.published_at)}</Text>
                        </View>
                      </View>
                      <Text style={{fontSize:12,color:C.text,lineHeight:17}} numberOfLines={2}>{a.headline}</Text>
                    </View>
                  )
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const p=StyleSheet.create({
  scoreCircle:{width:46,height:46,borderRadius:23,borderWidth:2,alignItems:'center',justifyContent:'center'},
  hCard:      {backgroundColor:C.surface,borderRadius:R.md,padding:8,alignItems:'center',borderWidth:0.5,minWidth:68},
  card:       {marginHorizontal:S.lg,backgroundColor:C.surface,borderRadius:R.lg,padding:S.md,marginBottom:S.md,borderWidth:0.5,borderColor:C.border},
  cardTitle:  {fontSize:11,fontWeight:'600',color:C.muted,textTransform:'uppercase',letterSpacing:0.6},
})