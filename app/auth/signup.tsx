import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { C, S, R } from '../../src/config/theme'

const VIP = ['radosavljevicdjordje01@gmail.com','djolenosmile@gmail.com','seriouslyabsurd01@gmail.com']

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw,    setPw]    = useState('')
  const [pw2,   setPw2]   = useState('')
  const [busy,  setBusy]  = useState(false)

  async function submit() {
    if (!email.trim() || !pw) { Alert.alert('Error', 'Fill in all fields'); return }
    if (pw !== pw2)            { Alert.alert('Error', 'Passwords do not match'); return }
    if (pw.length < 6)         { Alert.alert('Error', 'Password min 6 characters'); return }
    setBusy(true)
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: pw })
    if (error) { setBusy(false); Alert.alert('Failed', error.message); return }
    if (data.user) {
      const isVIP = VIP.includes(email.trim().toLowerCase())
      await supabase.from('user_access').upsert({
        user_id:             data.user.id,
        email:               email.trim().toLowerCase(),
        plan_type:           isVIP ? 'vip' : 'trial',
        subscription_status: 'active',
        trial_expires_at:    isVIP ? null : new Date(Date.now() + 7*86400000).toISOString(),
      }, { onConflict: 'user_id' })
    }
    setBusy(false)
  }

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={{ flex:1, paddingHorizontal:S.xl, justifyContent:'center' }}>
          <Text style={{ fontSize:26, fontWeight:'700', color:C.text, textAlign:'center' }}>Create Account</Text>
          <Text style={{ fontSize:13, color:C.green, textAlign:'center', marginTop:4, marginBottom:S.xl }}>7-day free trial</Text>

          <View style={{ gap: S.sm }}>
            {[
              { val:email, set:setEmail, ph:'Email', type:'email-address' as const, cap:'none' as const },
              { val:pw,    set:setPw,    ph:'Password', secure:true },
              { val:pw2,   set:setPw2,   ph:'Confirm Password', secure:true },
            ].map(f => (
              <TextInput key={f.ph}
                style={{ backgroundColor:C.surface, borderRadius:R.md, paddingHorizontal:14, paddingVertical:13, fontSize:15, color:C.text, borderWidth:0.5, borderColor:C.border }}
                value={f.val} onChangeText={f.set}
                placeholder={f.ph} placeholderTextColor={C.dim}
                autoCapitalize={f.cap ?? 'none'}
                keyboardType={f.type}
                secureTextEntry={f.secure}
              />
            ))}
            <TouchableOpacity style={[{ backgroundColor:C.green, borderRadius:R.md, paddingVertical:14, alignItems:'center', marginTop:4 }, busy && {opacity:0.6}]}
              onPress={submit} disabled={busy}>
              <Text style={{ fontSize:15, fontWeight:'700', color:'#000' }}>
                {busy ? 'Creating...' : 'Start Free Trial'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{ marginTop:S.lg, alignItems:'center' }}
            onPress={() => router.replace('/auth/login')}>
            <Text style={{ color:C.muted, fontSize:13 }}>
              Have account? <Text style={{ color:C.green }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}