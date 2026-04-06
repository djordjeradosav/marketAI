import { useState, useEffect, useCallback, useRef } from 'react'
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Linking, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../src/lib/supabase'
import { C, S, R } from '../../src/config/theme'

interface Article { id:string;headline:string;summary:string|null;source:string;url:string;published_at:string;sentiment:string;relevant_pairs:string[]|null }

const PAGE = 30

function ago(iso:string):string {
  const s=Math.floor((Date.now()-new Date(iso).getTime())/1000)
  if(s<60)return 'just now';if(s<3600)return`${Math.floor(s/60)}m ago`
  if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`
}

function Card({item}:{item:Article}) {
  const sc = item.sentiment==='positive'?C.green:item.sentiment==='negative'?C.red:C.muted
  const sb = item.sentiment==='positive'?'rgba(34,197,94,0.1)':item.sentiment==='negative'?'rgba(239,68,68,0.1)':'rgba(122,153,176,0.08)'
  return (
    <TouchableOpacity style={n.card} onPress={()=>Linking.openURL(item.url)} activeOpacity={0.75}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <View style={{flexDirection:'row',alignItems:'center',gap:6,flex:1}}>
          <Text style={n.src} numberOfLines={1}>{item.source?.toUpperCase()}</Text>
          <Text style={{fontSize:10,color:C.dim}}>· {ago(item.published_at)}</Text>
        </View>
        <View style={[n.sentBadge,{backgroundColor:sb}]}>
          <View style={{width:5,height:5,borderRadius:3,backgroundColor:sc}}/>
          <Text style={{fontSize:9,fontWeight:'600',color:sc}}>{item.sentiment?.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={n.headline} numberOfLines={3}>{item.headline}</Text>
      {item.summary?<Text style={n.summary} numberOfLines={2}>{item.summary}</Text>:null}
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:8,paddingTop:8,borderTopWidth:0.5,borderTopColor:C.border}}>
        <View style={{flexDirection:'row',gap:4,flex:1}}>
          {(item.relevant_pairs??[]).slice(0,3).map(p=>(
            <View key={p} style={{paddingHorizontal:6,paddingVertical:2,borderRadius:4,backgroundColor:'rgba(96,165,250,0.1)',borderWidth:0.5,borderColor:'rgba(96,165,250,0.25)'}}>
              <Text style={{fontSize:9,color:C.blue,fontWeight:'600'}}>{p}</Text>
            </View>
          ))}
        </View>
        <Text style={{fontSize:11,color:C.blue}}>Read ↗</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function NewsScreen() {
  const [articles,   setArticles]   = useState<Article[]>([])
  const [loading,    setLoading]    = useState(true)
  const [loadingMore,setLoadingMore]= useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore,    setHasMore]    = useState(true)
  const [page,       setPage]       = useState(0)
  const [search,     setSearch]     = useState('')
  const [sentiment,  setSentiment]  = useState('all')
  const [breaking,   setBreaking]   = useState<Article|null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null)

  async function fetch(p:number, reset:boolean, q:string, sent:string) {
    if(p>0)setLoadingMore(true)
    let query = supabase.from('news_articles')
      .select('id,headline,summary,source,url,published_at,sentiment,relevant_pairs')
      .order('published_at',{ascending:false})
      .not('headline','ilike','From @%')
      .range(p*PAGE,(p+1)*PAGE-1)
    if(sent!=='all') query=query.eq('sentiment',sent)
    if(q.length>=2) query=query.ilike('headline',`%${q}%`)
    const {data}=await query
    const fresh=(data??[]) as Article[]
    if(fresh.length<PAGE)setHasMore(false)
    if(reset||p===0){
      setArticles(fresh)
      const brk=fresh.find(a=>a.sentiment==='negative'&&Date.now()-new Date(a.published_at).getTime()<30*60*1000)
      setBreaking(brk??null)
    } else setArticles(prev=>[...prev,...fresh])
    setLoading(false);setLoadingMore(false)
  }

  useEffect(()=>{ fetch(0,true,search,sentiment) },[sentiment])

  useEffect(()=>{
    if(timer.current)clearTimeout(timer.current)
    timer.current=setTimeout(()=>{ setPage(0);setHasMore(true);fetch(0,true,search,sentiment) },400)
    return()=>{ if(timer.current)clearTimeout(timer.current) }
  },[search])

  const onRefresh=useCallback(async()=>{ setRefreshing(true);setPage(0);setHasMore(true);await fetch(0,true,search,sentiment);setRefreshing(false) },[search,sentiment])

  function loadMore() {
    if(!hasMore||loadingMore||loading)return
    const next=page+1;setPage(next);fetch(next,false,search,sentiment)
  }

  const SENTS=[{id:'all',label:'All',col:C.blue},{id:'positive',label:'Positive',col:C.green},{id:'neutral',label:'Neutral',col:C.muted},{id:'negative',label:'Negative',col:C.red}]

  return (
    <SafeAreaView style={n.safe} edges={['top']}>
      <View style={{paddingHorizontal:S.lg,paddingTop:S.md,paddingBottom:S.sm}}>
        <Text style={{fontSize:22,fontWeight:'700',color:C.text}}>Market News</Text>
      </View>

      <View style={{paddingHorizontal:S.lg,marginBottom:S.sm}}>
        <TextInput style={n.search} value={search} onChangeText={setSearch}
          placeholder="Search headlines..." placeholderTextColor={C.dim} clearButtonMode="while-editing"/>
      </View>

      <View style={{flexDirection:'row',gap:6,paddingHorizontal:S.lg,marginBottom:S.sm}}>
        {SENTS.map(s=>{
          const act=sentiment===s.id
          return (
            <TouchableOpacity key={s.id}
              style={[{paddingHorizontal:12,paddingVertical:5,borderRadius:R.full,borderWidth:0.5,borderColor:C.border}, act&&{borderColor:s.col,backgroundColor:s.col+'15'}]}
              onPress={()=>{setSentiment(s.id);setPage(0);setHasMore(true)}}>
              <Text style={{fontSize:12,fontWeight:'500',color:act?s.col:C.muted}}>{s.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {breaking&&(
        <TouchableOpacity style={n.breaking} onPress={()=>Linking.openURL(breaking.url)}>
          <View style={{width:8,height:8,borderRadius:4,backgroundColor:C.red}}/>
          <View style={{flex:1}}>
            <Text style={{fontSize:9,fontWeight:'800',color:C.red,letterSpacing:0.8}}>BREAKING</Text>
            <Text style={{fontSize:12,color:C.text,lineHeight:17,marginTop:2}} numberOfLines={2}>{breaking.headline}</Text>
          </View>
          <Text style={{fontSize:16,color:C.red}}>↗</Text>
        </TouchableOpacity>
      )}

      {loading?(
        <View style={{flex:1,alignItems:'center',justifyContent:'center'}}>
          <ActivityIndicator color={C.green} size="large"/>
        </View>
      ):(
        <FlatList
          data={articles}
          keyExtractor={item=>item.id}
          contentContainerStyle={{paddingHorizontal:S.lg,paddingBottom:100}}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.green}/>}
          renderItem={({item})=><Card item={item}/>}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore?<ActivityIndicator color={C.green} style={{marginVertical:20}}/>:null}
          ListEmptyComponent={<View style={{padding:S.xl,alignItems:'center'}}><Text style={{color:C.muted,fontSize:13}}>No articles found</Text></View>}
        />
      )}
    </SafeAreaView>
  )
}

const n=StyleSheet.create({
  safe:      {flex:1,backgroundColor:C.bg},
  search:    {backgroundColor:C.surface,borderRadius:R.md,paddingHorizontal:12,paddingVertical:10,fontSize:13,color:C.text,borderWidth:0.5,borderColor:C.border},
  breaking:  {marginHorizontal:S.lg,backgroundColor:'rgba(239,68,68,0.08)',borderWidth:0.5,borderColor:'rgba(239,68,68,0.3)',borderRadius:R.md,padding:S.md,marginBottom:S.sm,flexDirection:'row',alignItems:'center',gap:10},
  card:      {backgroundColor:C.surface,borderRadius:R.lg,padding:S.md,marginBottom:S.sm,borderWidth:0.5,borderColor:C.border},
  src:       {fontSize:10,fontWeight:'700',color:C.muted,letterSpacing:0.5},
  sentBadge: {flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:7,paddingVertical:2,borderRadius:R.full,backgroundColor:'rgba(122,153,176,0.08)'},
  headline:  {fontSize:13,fontWeight:'500',color:C.text,lineHeight:19},
  summary:   {fontSize:11,color:C.muted,lineHeight:16,marginTop:4},
})