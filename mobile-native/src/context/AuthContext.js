import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import authApi from '../api/auth.api'
import { setAuthToken, setUnauthorizedHandler } from '../api/client'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null)
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  const clearSession = useCallback(async () => {
    setToken(null)
    setUser(null)
    setAuthToken(null)
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY])
  }, [])

  const signIn = useCallback(async (authData) => {
    const nextToken = authData?.token || null
    const nextUser = authData?.user || null

    if (!nextToken) {
      throw new Error('Token topilmadi')
    }

    setToken(nextToken)
    setUser(nextUser)
    setAuthToken(nextToken)

    await AsyncStorage.multiSet([
      [TOKEN_KEY, nextToken],
      [USER_KEY, JSON.stringify(nextUser || {})]
    ])
  }, [])

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const [[, savedToken], [, savedUser]] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY])

        if (!mounted) return

        if (savedToken) {
          setToken(savedToken)
          setAuthToken(savedToken)
        }

        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser))
          } catch {
            setUser(null)
          }
        }
      } finally {
        if (mounted) setInitializing(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await clearSession()
    })

    return () => {
      setUnauthorizedHandler(null)
    }
  }, [clearSession])

  const login = async (phone, password) => {
    const data = await authApi.login(phone, password, 'mobile')
    if (!data?.token) {
      throw new Error("Login javobida token yo'q")
    }
    await signIn(data)
    return data
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      await clearSession()
    }
  }

  const value = useMemo(
    () => ({
      token,
      user,
      initializing,
      isAuthenticated: Boolean(token),
      login,
      logout,
      signIn,
      clearSession
    }),
    [token, user, initializing, signIn, clearSession]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
