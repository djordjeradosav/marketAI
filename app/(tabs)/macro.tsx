import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Dimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { C, S, R } from '../../src/config/theme'

const W = Dimensions.get('window').width

interface MacroRow { id:string;indicator:string;actual:number|null;previous:number|null;forecast:number|null;surprise:number|null;beat_miss:string;release_date:string;unit:string }

const TABS = [
  {id:'NFP',          label:'NFP',     unit:'K',  desc:'Non-Farm Payrolls'},
  {id:'CPI',          label:'CPI',     unit:'%',  desc:'Consumer Price Index'},
  {id:'CORE_CPI',     label:'Core CPI',unit:'%',  desc:'Core CPI ex food & energy'},
  {id:'PCE',          label:'PCE',     unit:'%',  desc:'Personal Consumption Expenditure'},
  {id:'UNEMPLOYMENT', label:'Unemploy',unit:'%',  desc:'Unemployment Rate'},
  {id:'INTEREST_RATE',label:'Rates',   unit:'%',  desc:'Federal Funds Rate'},
]

function fmt(id:string, v:number|null, unit:string): string {
  if (v==null) return '—'
  if (id==='NFP') return (v>=0?'+':'')+Math.round(v).toLocaleString()+'K'
  if (Math.abs(v)>100) return '—'
  return (v>0?'+':'')+v.toFixed(2)+unit
}

function fmtDate(iso:string): string {
  return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'2-digit'})
}

export default function Macro() {
  const [tab,       setTab]       = useState('NFP')
  const [data,      setData]      = useState<Record<string,MacroRow[]>>({})
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)

  async function load() {
    const results = await Promise.all(TABS.map(t => supabase.from('macro_indicators').select('*').eq('indicator',t.id).eq('country','US').order('release_date',{ascending:false}).limit(60)))
    const m: Record<string,MacroRow[]> = {}
    TABS.forEach((t,i) => { m[t.id] = (results[i].data??[]) as MacroRow[] })
    setData(m)
  }

  useEffect(() => { load().finally(()=>setLoading(false)) }, [])
  const onRefresh = useCallback(async()=>{ setRefreshing(true); await load(); setRefreshing(false) },[])

  const tabCfg   = TABS.find(t=>t.id===tab)!
  const rows     = data[tab]??[]
  const sorted   = [...rows].sort((a,b)=>new Date(b.release_date).getTime()-new Date(a.release_date).getTime())
  const chrono   = [...rows].sort((a,b)=>new Date(a.release_date).getTime()-new Date(b.release_date).getTime())
  const latest   = sorted[0]
  const prev     = sorted[1]
  const beats    = rows.filter(r=>r.beat_miss==='beat').length
  const total    = rows.filter(r=>r.beat_miss!=='pending').length
  const beatRate = total>0?Math.round(beats/total*100):0
  const tc       = latest?.beat_miss==='beat'?C.green:latest?.beat_miss==='miss'?C.red:C.muted
  const maxV     = Math.max(...chrono.map(r=>Math.abs(r.actual??0)))||1

  if (loading) return (
    <SafeAreaView style={{flex:1,backgroundColor:C.bg,alignItems:'center',justifyContent:'center'}}>
      <ActivityIndicator color={C.green} size="large"/>
    </SafeAreaView>
  )

  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.bg}} edges={['top']}>
      <View style={{paddingHorizontal:S.lg,paddingTop:S.md,paddingBottom:S.sm}}>
        <Text style={{fontSize:22,fontWeight:'700',color:C.text}}>Macro Data</Text>
        <Text style={{fontSize:11,color:C.muted,marginTop:2}}>US economic indicators · FRED API</Text>
      </View>

      {/* Tab switcher */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal:S.lg,gap:2,borderBottomWidth:0.5,borderBottomColor:C.border,marginBottom:S.md}}>
        {TABS.map(t => {
          const d   = data[t.id]?.[0]
          const dot = !d?C.dim:d.beat_miss==='beat'?C.green:d.beat_miss==='miss'?C.red:C.muted
          const act = tab===t.id
          return (
            <TouchableOpacity key={t.id}
              style={[{paddingHorizontal:12,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:4}, act&&{borderBottomWidth:2,borderBottomColor:C.green}]}
              onPress={()=>setTab(t.id)}>
              <Text style={{fontSize:12,fontWeight:'500',color:act?C.green:C.muted}}>{t.label}</Text>
              <View style={{width:5,height:5,borderRadius:3,backgroundColor:dot}}/>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{paddingBottom:100}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green}/>}>

        {rows.length===0 ? (
          <View style={{padding:S.xl,alignItems:'center'}}>
            <Text style={{color:C.muted,fontSize:13,textAlign:'center'}}>
              No data.{'\n'}Ensure FRED_API_KEY is set and fetch-fred-data has run.
            </Text>
          </View>
        ) : (
          <>
            {/* Stat cards */}
            <View style={{flexDirection:'row',gap:6,paddingHorizontal:S.lg,marginBottom:S.md}}>
              {[
                {label:'Latest',   val:fmt(tab,latest?.actual??null,tabCfg.unit),   col:tc},
                {label:'Forecast', val:fmt(tab,latest?.forecast??null,tabCfg.unit), col:C.amber},
                {label:'Previous', val:fmt(tab,prev?.actual??null,tabCfg.unit),     col:C.muted},
                {label:'Surprise', val:latest?.surprise!=null?(latest.surprise>=0?'+':'')+latest.surprise.toFixed(2)+tabCfg.unit:'—', col:tc},
              ].map(s=>(
                <View key={s.label} style={{flex:1,backgroundColor:C.surface,borderRadius:R.md,padding:S.sm,alignItems:'center',borderWidth:0.5,borderColor:C.border}}>
                  <Text style={{fontSize:8,color:C.muted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>{s.label}</Text>
                  <Text style={{fontSize:13,fontWeight:'700',color:s.col,textAlign:'center'}}>{s.val}</Text>
                </View>
              ))}
            </View>

            {/* Beat rate */}
            <View style={{marginHorizontal:S.lg,backgroundColor:C.surface,borderRadius:R.md,padding:S.md,marginBottom:S.md,borderWidth:0.5,borderColor:C.border}}>
              <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:6}}>
                <Text style={{fontSize:13,color:C.text}}>Beat forecast <Text style={{color:C.green,fontWeight:'700'}}>{beats}/{total}</Text> times</Text>
                <Text style={{fontSize:12,color:C.green,fontWeight:'600'}}>{beatRate}%</Text>
              </View>
              <View style={{height:6,backgroundColor:C.border,borderRadius:3,overflow:'hidden'}}>
                <View style={{height:6,backgroundColor:C.green,borderRadius:3,width:`${beatRate}%` as any}}/>
              </View>
            </View>

            {/* Bar chart */}
            <View style={{marginHorizontal:S.lg,backgroundColor:C.surface,borderRadius:R.lg,paddingVertical:S.md,marginBottom:S.md,borderWidth:0.5,borderColor:C.border}}>
              <Text style={{fontSize:11,fontWeight:'500',color:C.muted,textTransform:'uppercase',letterSpacing:0.6,paddingHorizontal:S.md,marginBottom:S.sm}}>
                {tabCfg.label} History
              </Text>
              <View style={{flexDirection:'row',alignItems:'flex-end',height:64,paddingHorizontal:S.md,gap:2}}>
                {chrono.slice(-24).map((r,i)=>{
                  const h   = Math.max(4,(Math.abs(r.actual??0)/maxV)*56)
                  const col = r.beat_miss==='beat'?C.green:r.beat_miss==='miss'?C.red:C.blue
                  return <View key={i} style={{flex:1,height:h,backgroundColor:col,borderRadius:2,opacity:0.85}}/>
                })}
              </View>
            </View>

            {/* Table */}
            <View style={{marginHorizontal:S.lg}}>
              <Text style={{fontSize:11,fontWeight:'600',color:C.muted,textTransform:'uppercase',letterSpacing:0.8,marginBottom:S.sm}}>Release History</Text>
              <View style={{flexDirection:'row',paddingVertical:6,borderBottomWidth:0.5,borderBottomColor:C.border}}>
                {['Date','Actual','Fcst','Surprise',''].map(h=>(
                  <Text key={h} style={{flex:h===''?0:1,fontSize:9,color:C.dim,textTransform:'uppercase',letterSpacing:0.4,width:h===''?44:undefined}}>{h}</Text>
                ))}
              </View>
              {sorted.map((r,i)=>{
                const rc  = r.beat_miss==='beat'?C.green:r.beat_miss==='miss'?C.red:C.muted
                const bm  = r.beat_miss
                const bmC = bm==='beat'?C.green:bm==='miss'?C.red:C.muted
                const bmBg= bm==='beat'?C.greenBg:bm==='miss'?C.redBg:C.elevated
                return (
                  <View key={r.id} style={{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:C.surface,borderLeftWidth:3,borderLeftColor:rc,paddingLeft:S.sm}}>
                    <Text style={{flex:1,fontSize:11,color:C.muted}}>{fmtDate(r.release_date)}</Text>
                    <Text style={{flex:1,fontSize:11,fontWeight:'600',color:rc}}>{fmt(tab,r.actual,tabCfg.unit)}</Text>
                    <Text style={{flex:1,fontSize:11,color:C.muted}}>{fmt(tab,r.forecast,tabCfg.unit)}</Text>
                    <Text style={{flex:1,fontSize:11,color:(r.surprise??0)>0?C.green:(r.surprise??0)<0?C.red:C.muted}}>
                      {r.surprise!=null?(r.surprise>=0?'+':'')+r.surprise.toFixed(2)+tabCfg.unit:'—'}
                    </Text>
                    <View style={{width:44,alignItems:'center'}}>
                      <View style={{paddingHorizontal:6,paddingVertical:2,borderRadius:4,backgroundColor:bmBg}}>
                        <Text style={{fontSize:9,fontWeight:'700',color:bmC}}>
                          {bm==='beat'?'BEAT':bm==='miss'?'MISS':bm==='inline'?'~OK':'—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}