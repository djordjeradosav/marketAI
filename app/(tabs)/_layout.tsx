import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'
import { colors } from '../../src/config/theme'

type IconName = React.ComponentProps<typeof Ionicons>['name']

interface TabConfig {
  name:        string
  title:       string
  icon:        IconName
  iconFocused: IconName
}

const TABS: TabConfig[] = [
  { name: 'index',   title: 'Dashboard', icon: 'grid-outline',       iconFocused: 'grid' },
  { name: 'scanner', title: 'Scanner',   icon: 'scan-outline',       iconFocused: 'scan' },
  { name: 'macro',   title: 'Macro',     icon: 'bar-chart-outline',  iconFocused: 'bar-chart' },
  { name: 'news',    title: 'News',      icon: 'newspaper-outline',  iconFocused: 'newspaper' },
  { name: 'more',    title: 'More',      icon: 'menu-outline',       iconFocused: 'menu' },
]

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor:  colors.surface,
          borderTopColor:   colors.border,
          borderTopWidth:   0.5,
          height:           Platform.OS === 'ios' ? 84 : 62,
          paddingBottom:    Platform.OS === 'ios' ? 24 : 8,
          paddingTop:       8,
        },
        tabBarActiveTintColor:   colors.green,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '500',
          marginTop:  2,
        },
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={22}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  )
}