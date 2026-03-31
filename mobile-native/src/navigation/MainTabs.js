import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Home, Users, History, BarChart3, Settings } from 'lucide-react-native'
import DashboardScreen from '../screens/DashboardScreen'
import CustomersScreen from '../screens/CustomersScreen'
import HistoryScreen from '../screens/HistoryScreen'
import ReportsScreen from '../screens/ReportsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import { useThemeMode } from '../context/ThemeContext'

const Tab = createBottomTabNavigator()

const iconMap = {
  BoshSahifa: Home,
  Mijozlar: Users,
  Tarix: History,
  Hisobot: BarChart3,
  Sozlamalar: Settings
}

export default function MainTabs() {
  const { theme } = useThemeMode()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const Icon = iconMap[route.name]
        return {
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.muted,
          tabBarStyle: {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            height: 64,
            paddingTop: 6,
            paddingBottom: 8
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600'
          },
          tabBarIcon: ({ color, size }) => <Icon color={color} size={size} />
        }
      }}
    >
      <Tab.Screen name="BoshSahifa" component={DashboardScreen} options={{ title: 'Bosh sahifa' }} />
      <Tab.Screen name="Mijozlar" component={CustomersScreen} options={{ title: 'Mijozlar' }} />
      <Tab.Screen name="Tarix" component={HistoryScreen} options={{ title: 'Tarix' }} />
      <Tab.Screen name="Hisobot" component={ReportsScreen} options={{ title: 'Hisobotlar' }} />
      <Tab.Screen name="Sozlamalar" component={ProfileScreen} options={{ title: 'Sozlamalar' }} />
    </Tab.Navigator>
  )
}
