import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d1117',
          borderTopColor:  '#1e2d3d',
          borderTopWidth:  0.5,
          height:          Platform.OS === 'ios' ? 84 : 60,
          paddingBottom:   Platform.OS === 'ios' ? 24 : 6,
          paddingTop:      6,
        },
        tabBarActiveTintColor:   '#22c55e',
        tabBarInactiveTintColor: '#7a99b0',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="index"
        options={{ title:'Dashboard', tabBarIcon:({ color }) =>
          <Ionicons name="grid-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="scanner"
        options={{ title:'Scanner', tabBarIcon:({ color }) =>
          <Ionicons name="scan-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="macro"
        options={{ title:'Macro', tabBarIcon:({ color }) =>
          <Ionicons name="bar-chart-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="news"
        options={{ title:'News', tabBarIcon:({ color }) =>
          <Ionicons name="newspaper-outline" size={22} color={color} /> }} />
      <Tabs.Screen name="more"
        options={{ title:'More', tabBarIcon:({ color }) =>
          <Ionicons name="menu-outline" size={22} color={color} /> }} />
    </Tabs>
  )
}