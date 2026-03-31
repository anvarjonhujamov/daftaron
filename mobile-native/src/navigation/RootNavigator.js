import React from 'react'
import { NavigationContainer, DarkTheme as NavDarkTheme, DefaultTheme as NavLightTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import MainTabs from './MainTabs'
import LoginScreen from '../screens/auth/LoginScreen'
import RegisterScreen from '../screens/auth/RegisterScreen'
import { useAuth } from '../context/AuthContext'
import { useThemeMode } from '../context/ThemeContext'
import LoadingView from '../components/LoadingView'

const Stack = createNativeStackNavigator()

export default function RootNavigator() {
  const { isAuthenticated, initializing } = useAuth()
  const { darkMode, themeReady, theme } = useThemeMode()

  if (initializing || !themeReady) {
    return <LoadingView label="Ilova yuklanmoqda..." />
  }

  const navTheme = darkMode
    ? {
        ...NavDarkTheme,
        colors: {
          ...NavDarkTheme.colors,
          background: theme.background,
          card: theme.card,
          border: theme.border,
          text: theme.text,
          primary: theme.primary
        }
      }
    : {
        ...NavLightTheme,
        colors: {
          ...NavLightTheme.colors,
          background: theme.background,
          card: theme.card,
          border: theme.border,
          text: theme.text,
          primary: theme.primary
        }
      }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </>
          ) : (
            <Stack.Screen name="MainTabs" component={MainTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  )
}
