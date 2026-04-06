import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { useStore } from '../../src/store'
import { timeAgo } from '../../src/lib/data'
import { C, S, R } from '../../src/config/theme'

function Row({ icon, label, sub, onPress, color }: { icon:string;label:string;sub?:string;onPress:()=>void;color?:string }) {
  return (
    <TouchableOpacity style={mo.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={{fontSize:20,width:32}}>{icon}</Text>
      <View style={{flex:1}}>
        <Text style={[mo.rowLabel,color?{color}:{}]}>{label}</Text>
        {sub?<Text style={mo.rowSub}>{sub}</Text>:null}
      </View>
      <Text style={{color:C.dim,fontSize:16}}>›</Text>
    </TouchableOpacity>
  )
}

export default function More() {
  const router    = useRouter()
  const lastScanAt= useStore(s=>s.lastScanAt)

  async function signOut() {
    Alert.alert('Sign Out','Are you sure?',[
      {text:'Cancel',style:'cancel'},
      {text:'Sign Out',style:'destructive', onPress:async()=>{ await supabase.auth.signOut(); router.replace('/auth/login') }},
    ])
  }

  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.bg}} edges={['top']}>
      <View style={{paddingHorizontal:S.lg,paddingTop:S.md,paddingBottom:S.md}}>
        <Text style={{fontSize:22,fontWeight:'700',color:C.text}}>More</Text>
      </View>
      <ScrollView contentContainerStyle={{paddingBottom:100}}>

        <Text style={mo.groupLabel}>Tools</Text>
        <View style={mo.group}>
          <Row icon="🌿" label="Seasonality"        sub="Historical monthly bias"   onPress={()=>router.push('/seasonality')}/>
          <Row icon="📅" label="Economic Calendar"  sub="Upcoming events"           onPress={()=>router.push('/calendar')}/>
          <Row icon="📊" label="COT Data"            sub="CFTC positioning"          onPress={()=>router.push('/cot')}/>
        </View>

        <Text style={mo.groupLabel}>Status</Text>
        <View style={mo.group}>
          <View style={mo.infoRow}>
            <Text style={mo.infoLabel}>Last scan</Text>
            <Text style={mo.infoVal}>{timeAgo(lastScanAt)}</Text>
          </View>
          <View style={mo.infoRow}>
            <Text style={mo.infoLabel}>Data source</Text>
            <Text style={mo.infoVal}>Finnhub · FRED · NewsAPI</Text>
          </View>
        </View>

        <Text style={mo.groupLabel}>Account</Text>
        <View style={mo.group}>
          <Row icon="💎" label="Upgrade Plan" sub="Unlock all features" onPress={()=>router.push('/paywall')} color={C.amber}/>
          <Row icon="🚪" label="Sign Out" onPress={signOut} color={C.red}/>
        </View>

        <Text style={{textAlign:'center',color:C.dim,fontSize:11,marginTop:S.xl}}>TrendScan AI v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const mo=StyleSheet.create({
  group:      {marginHorizontal:S.lg,backgroundColor:C.surface,borderRadius:R.lg,borderWidth:0.5,borderColor:C.border,overflow:'hidden'},
  groupLabel: {fontSize:11,fontWeight:'600',color:C.dim,textTransform:'uppercase',letterSpacing:0.8,paddingHorizontal:S.lg,marginBottom:6,marginTop:S.lg},
  row:        {flexDirection:'row',alignItems:'center',padding:S.md,borderBottomWidth:0.5,borderBottomColor:C.border,gap:12},
  rowLabel:   {fontSize:14,fontWeight:'500',color:C.text},
  rowSub:     {fontSize:11,color:C.muted,marginTop:1},
  infoRow:    {flexDirection:'row',justifyContent:'space-between',padding:S.md,borderBottomWidth:0.5,borderBottomColor:C.border},
  infoLabel:  {fontSize:13,color:C.muted},
  infoVal:    {fontSize:13,color:C.text,fontWeight:'500'},
})