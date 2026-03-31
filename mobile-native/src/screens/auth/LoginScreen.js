import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native'
import { ArrowRight, Eye, EyeOff, Lock, Phone } from 'lucide-react-native'
import { useAuth } from '../../context/AuthContext'
import { useThemeMode } from '../../context/ThemeContext'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../../utils/phone'

export default function LoginScreen({ navigation }) {
  const { theme } = useThemeMode()
  const { login } = useAuth()

  const [phone, setPhone] = useState(PHONE_PREFIX)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorText, setErrorText] = useState('')

  const styles = useMemo(() => createStyles(theme), [theme])

  const handleSubmit = async () => {
    if (!password.trim()) {
      setErrorText('Parolni kiriting')
      return
    }

    setLoading(true)
    setErrorText('')

    try {
      const rawPhone = getRawPhoneNumber(phone)
      await login(rawPhone, password)
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Kirishda xatolik yuz berdi'
      setErrorText(message)
      Alert.alert('Kirish amalga oshmadi', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.logoWrap}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>Daftaron</Text>
        <Text style={styles.subtitle}>Nasiya boshqaruvi tizimi</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kirish</Text>

        <Text style={styles.label}>Telefon raqam</Text>
        <View style={styles.inputWrap}>
          <Phone size={18} color={theme.muted} />
          <TextInput
            style={styles.input}
            value={phone}
            keyboardType="phone-pad"
            placeholder={PHONE_PREFIX + ' 90 123 45 67'}
            placeholderTextColor={theme.muted}
            onChangeText={(v) => setPhone(formatPhoneNumber(v))}
          />
        </View>

        <Text style={styles.label}>Parol</Text>
        <View style={styles.inputWrap}>
          <Lock size={18} color={theme.muted} />
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={password}
            placeholder="********"
            placeholderTextColor={theme.muted}
            secureTextEntry={!showPassword}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setShowPassword((s) => !s)}>
            {showPassword ? <EyeOff size={18} color={theme.muted} /> : <Eye size={18} color={theme.muted} />}
          </Pressable>
        </View>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <Pressable style={styles.primaryBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.btnContent}>
              <Text style={styles.primaryBtnText}>Kirish</Text>
              <ArrowRight color="#fff" size={18} />
            </View>
          )}
        </Pressable>

        <Pressable style={styles.linkBtn} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.linkText}>Hisobingiz yo'qmi? Ro'yxatdan o'tish</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      backgroundColor: theme.background
    },
    logoWrap: {
      alignItems: 'center',
      marginBottom: 28
    },
    logo: {
      width: 76,
      height: 76,
      borderRadius: 24,
      marginBottom: 10
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text
    },
    subtitle: {
      marginTop: 6,
      color: theme.muted,
      fontSize: 14
    },
    card: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 16
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 14,
      textAlign: 'center'
    },
    label: {
      fontSize: 13,
      color: theme.muted,
      marginBottom: 6,
      marginTop: 6
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.mode === 'dark' ? '#0f172a' : '#fff'
    },
    input: {
      color: theme.text,
      fontSize: 16,
      paddingVertical: 2,
      flex: 1
    },
    errorText: {
      marginTop: 10,
      color: theme.danger,
      fontSize: 13
    },
    primaryBtn: {
      marginTop: 14,
      borderRadius: 14,
      backgroundColor: theme.primary,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center'
    },
    btnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    primaryBtnText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '700'
    },
    linkBtn: {
      marginTop: 14,
      alignItems: 'center'
    },
    linkText: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600'
    }
  })
}
