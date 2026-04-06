import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { supabase } from '../src/lib/supabase'
import { useStore, selUser, selAuthReady } from '../src/store'
import { loadAllScores } from '../src/lib/data'

export default function RootLayout() {
  const setUser    = useStore((s) => s.setUser)
  const setReady   = useStore((s) => s.setAuthReady)
  const user       = useStore(selUser)
  const authReady  = useStore(selAuthReady)
  const router     = useRouter()
  const segs       = useSegments()

  // Boot: check existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null)
        setReady(true)
        if (session?.user) {
          loadAllScores().catch(() => {})
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  // Route guard
  useEffect(() => {
    if (!authReady) return
    const inAuth = segs[0] === 'auth'
    if (!user && !inAuth) router.replace('/auth/login')
    if (user && inAuth)   router.replace('/(tabs)')
  }, [user, authReady])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#080c10" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="pair/[symbol]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="seasonality"   options={{ presentation: 'modal' }} />
        <Stack.Screen name="calendar"      options={{ presentation: 'modal' }} />
        <Stack.Screen name="cot"           options={{ presentation: 'modal' }} />
        <Stack.Screen name="paywall"       options={{ presentation: 'modal' }} />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
      </Stack>
    </GestureHandlerRootView>
  )
}