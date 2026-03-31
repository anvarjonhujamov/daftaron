import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { darkTheme, lightTheme } from '../theme/colors'

const STORAGE_KEY = 'darkMode'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(false)
  const [themeReady, setThemeReady] = useState(false)

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY)
        if (mounted && saved !== null) {
          setDarkMode(saved === 'true')
        }
      } finally {
        if (mounted) setThemeReady(true)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const toggleDarkMode = async () => {
    const next = !darkMode
    setDarkMode(next)
    await AsyncStorage.setItem(STORAGE_KEY, String(next))
  }

  const value = useMemo(
    () => ({
      darkMode,
      themeReady,
      theme: darkMode ? darkTheme : lightTheme,
      toggleDarkMode
    }),
    [darkMode, themeReady]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode must be used inside ThemeProvider')
  return ctx
}
