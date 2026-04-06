import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  {
    auth: {
      storage: {
        getItem:    (k: string) => SecureStore.getItemAsync(k),
        setItem:    (k: string, v: string) => SecureStore.setItemAsync(k, v),
        removeItem: (k: string) => SecureStore.deleteItemAsync(k),
      },
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: false,
    },
  }
)