import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { C, S, R } from '../../src/config/theme'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw,    setPw]    = useState('')
  const [busy,  setBusy]  = useState(false)

  async function submit() {
    if (!email.trim() || !pw) { Alert.alert('Error', 'Fill in all fields'); return }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw })
    setBusy(false)
    if (error) Alert.alert('Failed', error.message)
  }

  return (
    <SafeAreaView style={a.safe}>
      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
        <View style={a.wrap}>
          <Text style={a.logo}>📈</Text>
          <Text style={a.title}>TrendScan AI</Text>
          <Text style={a.sub}>Real-time market intelligence</Text>

          <View style={{ gap: S.sm, marginTop: S.xl }}>
            <TextInput style={a.input} value={email} onChangeText={setEmail}
              placeholder="Email" placeholderTextColor={C.dim}
              autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={a.input} value={pw} onChangeText={setPw}
              placeholder="Password" placeholderTextColor={C.dim} secureTextEntry />
            <TouchableOpacity style={[a.btn, busy && {opacity:0.6}]} onPress={submit} disabled={busy}>
              <Text style={a.btnText}>{busy ? 'Signing in...' : 'Sign In'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{ marginTop: S.lg, alignItems:'center' }}
            onPress={() => router.replace('/auth/signup')}>
            <Text style={{ color: C.muted, fontSize:13 }}>
              No account? <Text style={{ color: C.green }}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const a = StyleSheet.create({
  safe:    { flex:1, backgroundColor: C.bg },
  wrap:    { flex:1, paddingHorizontal:S.xl, justifyContent:'center' },
  logo:    { fontSize:52, textAlign:'center' },
  title:   { fontSize:26, fontWeight:'700', color:C.text, textAlign:'center', marginTop:S.md },
  sub:     { fontSize:13, color:C.muted, textAlign:'center', marginTop:4 },
  input:   { backgroundColor:C.surface, borderRadius:R.md, paddingHorizontal:14, paddingVertical:13, fontSize:15, color:C.text, borderWidth:0.5, borderColor:C.border },
  btn:     { backgroundColor:C.green, borderRadius:R.md, paddingVertical:14, alignItems:'center', marginTop:4 },
  btnText: { fontSize:15, fontWeight:'700', color:'#000' },
})