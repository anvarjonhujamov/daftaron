import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native'
import { LogOut, Moon, Sun } from 'lucide-react-native'
import { useAuth } from '../context/AuthContext'
import { useThemeMode } from '../context/ThemeContext'
import profileApi from '../api/profile.api'
import { PHONE_PREFIX, formatPhoneNumber } from '../utils/phone'

export default function ProfileScreen() {
  const { theme, darkMode, toggleDarkMode } = useThemeMode()
  const { user, logout } = useAuth()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [profileForm, setProfileForm] = useState({ name: '', phone: PHONE_PREFIX, email: '' })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' })

  useEffect(() => {
    let mounted = true

    ;(async () => {
      try {
        const data = await profileApi.getProfile()
        const p = data?.profile || data?.user || data || {}

        if (!mounted) return

        setProfileForm({
          name: p.name || user?.name || '',
          phone: p.phone || user?.phone || PHONE_PREFIX,
          email: p.email || user?.email || ''
        })
      } catch {
        if (mounted) {
          setProfileForm({
            name: user?.name || '',
            phone: user?.phone || PHONE_PREFIX,
            email: user?.email || ''
          })
        }
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [user?.name, user?.phone, user?.email])

  async function handleSaveProfile() {
    if (!profileForm.name.trim()) {
      Alert.alert('Xatolik', 'Ism maydoni majburiy')
      return
    }

    setSavingProfile(true)
    try {
      await profileApi.updateProfile({
        name: profileForm.name,
        phone: profileForm.phone,
        email: profileForm.email
      })
      Alert.alert('Saqlandi', 'Profil ma\'lumotlari yangilandi')
    } catch (err) {
      Alert.alert('Xatolik', err?.response?.data?.message || 'Profilni saqlashda xatolik')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSavePassword() {
    if (passwordForm.password.length < 8) {
      Alert.alert('Xatolik', 'Yangi parol kamida 8 belgi bo\'lishi kerak')
      return
    }

    if (passwordForm.password !== passwordForm.password_confirmation) {
      Alert.alert('Xatolik', 'Parollar mos emas')
      return
    }

    setSavingPassword(true)
    try {
      await profileApi.updatePassword(passwordForm)
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' })
      Alert.alert('Saqlandi', 'Parol muvaffaqiyatli yangilandi')
    } catch (err) {
      Alert.alert('Xatolik', err?.response?.data?.message || 'Parolni yangilashda xatolik')
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // ignored
    }
  }

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Sozlamalar</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profil</Text>

        <Text style={styles.label}>Ism</Text>
        <TextInput
          style={styles.input}
          value={profileForm.name}
          onChangeText={(v) => setProfileForm((p) => ({ ...p, name: v }))}
          placeholder="Ismingiz"
          placeholderTextColor={theme.muted}
        />

        <Text style={styles.label}>Telefon</Text>
        <TextInput
          style={styles.input}
          value={profileForm.phone}
          onChangeText={(v) => setProfileForm((p) => ({ ...p, phone: formatPhoneNumber(v) }))}
          placeholder={PHONE_PREFIX + ' 90 123 45 67'}
          keyboardType="phone-pad"
          placeholderTextColor={theme.muted}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={profileForm.email}
          onChangeText={(v) => setProfileForm((p) => ({ ...p, email: v }))}
          placeholder="example@mail.com"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={theme.muted}
        />

        <Pressable style={styles.primaryBtn} onPress={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Saqlash</Text>}
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.rowCenter}>
            {darkMode ? <Moon size={16} color={theme.text} /> : <Sun size={16} color={theme.text} />}
            <Text style={styles.cardTitle}>{darkMode ? 'Tungi rejim' : 'Kunduzgi rejim'}</Text>
          </View>
          <Switch value={darkMode} onValueChange={toggleDarkMode} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Parolni o'zgartirish</Text>

        <Text style={styles.label}>Joriy parol</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={passwordForm.current_password}
          onChangeText={(v) => setPasswordForm((p) => ({ ...p, current_password: v }))}
          placeholder="********"
          placeholderTextColor={theme.muted}
        />

        <Text style={styles.label}>Yangi parol</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={passwordForm.password}
          onChangeText={(v) => setPasswordForm((p) => ({ ...p, password: v }))}
          placeholder="Kamida 8 belgi"
          placeholderTextColor={theme.muted}
        />

        <Text style={styles.label}>Parol tasdig'i</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={passwordForm.password_confirmation}
          onChangeText={(v) => setPasswordForm((p) => ({ ...p, password_confirmation: v }))}
          placeholder="Parolni qayta kiriting"
          placeholderTextColor={theme.muted}
        />

        <Pressable style={styles.primaryBtn} onPress={handleSavePassword} disabled={savingPassword}>
          {savingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Yangilash</Text>}
        </Pressable>
      </View>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={16} color="#fff" />
        <Text style={styles.logoutText}>Chiqish</Text>
      </Pressable>
    </ScrollView>
  )
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background
    },
    content: {
      padding: 14,
      paddingBottom: 30
    },
    loaderWrap: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center'
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 10
    },
    card: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.card,
      padding: 12,
      marginBottom: 10
    },
    cardTitle: {
      color: theme.text,
      fontWeight: '700',
      fontSize: 15
    },
    label: {
      color: theme.muted,
      fontSize: 12,
      marginTop: 10,
      marginBottom: 5
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      color: theme.text,
      backgroundColor: theme.mode === 'dark' ? '#0f172a' : '#fff'
    },
    primaryBtn: {
      marginTop: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 11
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700'
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    rowCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
      borderRadius: 12,
      backgroundColor: '#EF4444',
      paddingVertical: 12
    },
    logoutText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 14
    }
  })
}
