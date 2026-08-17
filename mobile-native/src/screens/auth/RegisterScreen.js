import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native'
import authApi from '../../api/auth.api'
import categoriesApi from '../../api/categories.api'
import locationsApi from '../../api/locations.api'
import { useAuth } from '../../context/AuthContext'
import { useThemeMode } from '../../context/ThemeContext'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../../utils/phone'

const STEPS = { base: 1, verify: 2, password: 3, complete: 4 }

export default function RegisterScreen({ navigation }) {
  const { theme } = useThemeMode()
  const { signIn } = useAuth()

  const [step, setStep] = useState(STEPS.base)
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [phoneCache, setPhoneCache] = useState('')

  const [step1, setStep1] = useState({ name: '', phone: PHONE_PREFIX })
  const [code, setCode] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [formPassword, setFormPassword] = useState({
    password: '',
    password_confirmation: ''
  })

  const [complete, setComplete] = useState({
    shop_name: '',
    category_id: null,
    region_id: null,
    district_id: null,
    street_id: null
  })

  const [categories, setCategories] = useState([])
  const [regions, setRegions] = useState([])
  const [districts, setDistricts] = useState([])
  const [streets, setStreets] = useState([])

  const styles = useMemo(() => createStyles(theme), [theme])

  useEffect(() => {
    if (step !== STEPS.complete) return

    let mounted = true

    ;(async () => {
      try {
        const [catsRaw, regionsRaw] = await Promise.all([
          categoriesApi.getCategories(),
          locationsApi.getRegions()
        ])

        const cats = normalizeArray(catsRaw)
        const regs = normalizeArray(regionsRaw)

        if (!mounted) return

        setCategories(cats)
        setRegions(regs)

        setComplete((prev) => ({
          ...prev,
          category_id: prev.category_id ?? cats[0]?.id ?? null,
          region_id: prev.region_id ?? regs[0]?.id ?? null
        }))
      } catch {
        // silent fallback
      }
    })()

    return () => {
      mounted = false
    }
  }, [step])

  useEffect(() => {
    if (step !== STEPS.complete || !complete.region_id) return

    let mounted = true
    ;(async () => {
      try {
        const districtsRaw = await locationsApi.getDistricts(complete.region_id)
        const districtList = normalizeArray(districtsRaw)
        if (!mounted) return

        setDistricts(districtList)
        setComplete((prev) => ({
          ...prev,
          district_id: districtList[0]?.id ?? null,
          street_id: null
        }))
      } catch {
        if (mounted) {
          setDistricts([])
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [complete.region_id, step])

  useEffect(() => {
    if (step !== STEPS.complete || !complete.district_id) return

    let mounted = true
    ;(async () => {
      try {
        const streetsRaw = await locationsApi.getStreets(complete.district_id)
        const streetList = normalizeArray(streetsRaw)
        if (!mounted) return

        setStreets(streetList)
        setComplete((prev) => ({
          ...prev,
          street_id: streetList[0]?.id ?? null
        }))
      } catch {
        if (mounted) {
          setStreets([])
        }
      }
    })()

    return () => {
      mounted = false
    }
  }, [complete.district_id, step])

  const handleStep1Submit = async () => {
    if (!step1.name.trim()) {
      setErrorText('Ismni kiriting')
      return
    }

    if (!acceptedTerms) {
      setErrorText('Davom etish uchun shartlarga rozilik kerak')
      return
    }

    setErrorText('')
    setLoading(true)

    try {
      const rawPhone = getRawPhoneNumber(step1.phone)
      await authApi.registerStep1(step1.name.trim(), rawPhone, 'mobile')
      setPhoneCache(rawPhone)
      setCode('')
      setStep(STEPS.verify)
    } catch (err) {
      const message = err?.response?.data?.message || 'Ro\'yxatdan o\'tishda xatolik'
      setErrorText(message)
      Alert.alert('Xatolik', message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySubmit = async () => {
    if (code.length !== 4) {
      setErrorText('4 xonali kodni kiriting')
      return
    }

    setErrorText('')
    setLoading(true)

    try {
      const data = await authApi.verify(phoneCache, code, 'register')

      if (data?.requires_password_setup) {
        setFormPassword({ password: '', password_confirmation: '' })
        setStep(STEPS.password)
        return
      }

      if (data?.requires_completion) {
        setStep(STEPS.complete)
        return
      }

      if (data?.token) {
        await signIn(data)
        return
      }

      setErrorText('Noma\'lum javob keldi')
    } catch (err) {
      const message = err?.response?.data?.message || 'Kod noto\'g\'ri yoki eskirgan'
      setErrorText(message)
      Alert.alert('Tasdiqlash xatosi', message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async () => {
    if (formPassword.password.length < 8) {
      setErrorText('Parol kamida 8 ta belgi bo\'lishi kerak')
      return
    }

    if (formPassword.password !== formPassword.password_confirmation) {
      setErrorText('Parollar bir xil emas')
      return
    }

    setErrorText('')
    setLoading(true)

    try {
      const data = await authApi.registerPassword(
        phoneCache,
        formPassword.password,
        formPassword.password_confirmation
      )

      if (data?.requires_completion) {
        setStep(STEPS.complete)
      } else {
        setErrorText('Noma\'lum javob keldi')
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Parolni saqlashda xatolik'
      setErrorText(message)
      Alert.alert('Parol xatosi', message)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteSubmit = async () => {
    if (!complete.shop_name.trim()) {
      setErrorText('Do\'kon nomini kiriting')
      return
    }

    setErrorText('')
    setLoading(true)

    try {
      const data = await authApi.registerComplete({
        phone: phoneCache,
        shop_name: complete.shop_name.trim(),
        category_id: complete.category_id,
        region_id: complete.region_id,
        district_id: complete.district_id,
        street_id: complete.street_id
      })

      if (data?.token) {
        await signIn(data)
      } else {
        Alert.alert('Diqqat', 'Hisob yaratildi, endi login qiling')
        navigation.replace('Login')
      }
    } catch (err) {
      const message = err?.response?.data?.message || 'Ro\'yxatdan o\'tish yakunida xatolik'
      setErrorText(message)
      Alert.alert('Xatolik', message)
    } finally {
      setLoading(false)
    }
  }

  const goBack = () => {
    if (step === STEPS.base) navigation.goBack()
    else if (step === STEPS.verify) setStep(STEPS.base)
    else if (step === STEPS.password) setStep(STEPS.verify)
    else setStep(STEPS.password)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollWrap} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Pressable onPress={goBack} style={styles.backBtn}>
            <ArrowLeft size={18} color={theme.text} />
          </Pressable>
          <View>
            <Text style={styles.title}>Ro'yxatdan o'tish</Text>
            <Text style={styles.stepText}>{step}/4 bosqich</Text>
          </View>
        </View>

        <View style={styles.card}>
          {step === STEPS.base ? (
            <>
              <Text style={styles.label}>To'liq ism</Text>
              <TextInput
                style={styles.input}
                value={step1.name}
                placeholder="Ismingiz"
                placeholderTextColor={theme.muted}
                onChangeText={(value) => setStep1((prev) => ({ ...prev, name: value }))}
              />

              <Text style={styles.label}>Telefon raqam</Text>
              <TextInput
                style={styles.input}
                value={step1.phone}
                keyboardType="phone-pad"
                placeholder={PHONE_PREFIX + ' 90 123 45 67'}
                placeholderTextColor={theme.muted}
                onChangeText={(value) => setStep1((prev) => ({ ...prev, phone: formatPhoneNumber(value) }))}
              />

              <View style={styles.switchRow}>
                <Switch value={acceptedTerms} onValueChange={setAcceptedTerms} />
                <Text style={styles.switchLabel}>Ommaviy oferta shartlariga roziman</Text>
              </View>

              <Pressable style={styles.primaryBtn} onPress={handleStep1Submit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Davom etish</Text>}
              </Pressable>
            </>
          ) : null}

          {step === STEPS.verify ? (
            <>
              <Text style={styles.helperText}>{phoneCache} raqamiga yuborilgan 4 xonali kodni kiriting.</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={code}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="1234"
                placeholderTextColor={theme.muted}
                onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 4))}
              />

              <Pressable style={styles.primaryBtn} onPress={handleVerifySubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Tasdiqlash</Text>}
              </Pressable>
            </>
          ) : null}

          {step === STEPS.password ? (
            <>
              <Text style={styles.helperText}>Hisobingiz uchun parol yarating (kamida 8 ta belgi).</Text>

              <Text style={styles.label}>Parol</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  value={formPassword.password}
                  secureTextEntry={!showPassword}
                  placeholder="Kamida 8 belgi"
                  placeholderTextColor={theme.muted}
                  onChangeText={(value) =>
                    setFormPassword((prev) => ({ ...prev, password: value }))
                  }
                />
                <Pressable style={styles.iconBtn} onPress={() => setShowPassword((s) => !s)}>
                  {showPassword ? <EyeOff size={18} color={theme.muted} /> : <Eye size={18} color={theme.muted} />}
                </Pressable>
              </View>

              <Text style={styles.label}>Parolni tasdiqlang</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.flexInput]}
                  value={formPassword.password_confirmation}
                  secureTextEntry={!showConfirm}
                  placeholder="Parolni qaytaring"
                  placeholderTextColor={theme.muted}
                  onChangeText={(value) =>
                    setFormPassword((prev) => ({ ...prev, password_confirmation: value }))
                  }
                />
                <Pressable style={styles.iconBtn} onPress={() => setShowConfirm((s) => !s)}>
                  {showConfirm ? <EyeOff size={18} color={theme.muted} /> : <Eye size={18} color={theme.muted} />}
                </Pressable>
              </View>

              <Pressable style={styles.primaryBtn} onPress={handlePasswordSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Davom etish</Text>}
              </Pressable>
            </>
          ) : null}

          {step === STEPS.complete ? (
            <>
              <Text style={styles.label}>Do'kon nomi</Text>
              <TextInput
                style={styles.input}
                value={complete.shop_name}
                placeholder="Do'koningiz nomi"
                placeholderTextColor={theme.muted}
                onChangeText={(value) => setComplete((prev) => ({ ...prev, shop_name: value }))}
              />

              <Text style={styles.label}>Kategoriya</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={complete.category_id}
                  onValueChange={(value) => setComplete((prev) => ({ ...prev, category_id: value }))}
                  dropdownIconColor={theme.muted}
                  style={styles.picker}
                >
                  {categories.map((item) => (
                    <Picker.Item key={item.id} label={item.name} value={item.id} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Viloyat</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={complete.region_id}
                  onValueChange={(value) => setComplete((prev) => ({ ...prev, region_id: value }))}
                  dropdownIconColor={theme.muted}
                  style={styles.picker}
                >
                  {regions.map((item) => (
                    <Picker.Item key={item.id} label={item.name} value={item.id} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Tuman</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={complete.district_id}
                  onValueChange={(value) => setComplete((prev) => ({ ...prev, district_id: value }))}
                  dropdownIconColor={theme.muted}
                  style={styles.picker}
                >
                  {districts.map((item) => (
                    <Picker.Item key={item.id} label={item.name} value={item.id} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Ko'cha / MFY</Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={complete.street_id}
                  onValueChange={(value) => setComplete((prev) => ({ ...prev, street_id: value }))}
                  dropdownIconColor={theme.muted}
                  style={styles.picker}
                >
                  {streets.map((item) => (
                    <Picker.Item key={item.id} label={item.name} value={item.id} />
                  ))}
                </Picker>
              </View>

              <Pressable style={styles.primaryBtn} onPress={handleCompleteSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Ro'yxatdan o'tish</Text>}
              </Pressable>
            </>
          ) : null}

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function normalizeArray(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return []
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background
    },
    scrollWrap: {
      padding: 16,
      paddingBottom: 40
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 12
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.card
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text
    },
    stepText: {
      marginTop: 2,
      color: theme.muted,
      fontSize: 13
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      padding: 14
    },
    helperText: {
      color: theme.muted,
      fontSize: 13,
      marginBottom: 10
    },
    label: {
      color: theme.muted,
      fontSize: 13,
      marginTop: 10,
      marginBottom: 6
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.text,
      backgroundColor: theme.mode === 'dark' ? '#0f172a' : '#fff'
    },
    codeInput: {
      textAlign: 'center',
      fontSize: 22,
      letterSpacing: 8
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      gap: 10
    },
    switchLabel: {
      flex: 1,
      color: theme.text,
      fontSize: 13
    },
    pickerWrap: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.mode === 'dark' ? '#0f172a' : '#fff'
    },
    picker: {
      color: theme.text
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8
    },
    flexInput: {
      flex: 1
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mode === 'dark' ? '#0f172a' : '#fff'
    },
    primaryBtn: {
      marginTop: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
      paddingVertical: 12
    },
    primaryBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15
    },
    errorText: {
      marginTop: 10,
      color: theme.danger,
      fontSize: 13
    }
  })
}
