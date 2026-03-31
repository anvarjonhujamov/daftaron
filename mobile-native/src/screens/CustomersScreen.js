import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native'
import { Plus, Search, X } from 'lucide-react-native'
import { useFocusEffect } from '@react-navigation/native'
import customersApi from '../api/customers.api'
import { useThemeMode } from '../context/ThemeContext'
import { formatCurrency } from '../utils/format'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../utils/phone'

export default function CustomersScreen() {
  const { theme } = useThemeMode()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const [showAdd, setShowAdd] = useState(false)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState(PHONE_PREFIX)
  const [submitting, setSubmitting] = useState(false)

  useFocusEffect(
    React.useCallback(() => {
      loadCustomers()
    }, [])
  )

  async function loadCustomers() {
    try {
      const data = await customersApi.getCustomers()
      setCustomers(normalizeArray(data))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function handleAddCustomer() {
    if (!formName.trim()) {
      Alert.alert('Xatolik', 'Mijoz ismini kiriting')
      return
    }

    setSubmitting(true)
    try {
      const phone = getRawPhoneNumber(formPhone)
      await customersApi.createCustomer({
        name: formName.trim(),
        phone: phone !== '+998' ? phone : null
      })

      setFormName('')
      setFormPhone(PHONE_PREFIX)
      setShowAdd(false)
      await loadCustomers()
    } catch (err) {
      Alert.alert('Xatolik', err?.response?.data?.message || 'Mijoz qo\'shishda xatolik')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = customers.filter((c) => {
    const debt = getDebt(c)

    if (filter === 'debtors' && debt <= 0) return false
    if (filter === 'paid' && debt > 0) return false

    const q = search.trim().toLowerCase()
    if (!q) return true

    const name = (c.name || c.customer_name || '').toLowerCase()
    const phone = (c.phone || c.customer_phone || '').replace(/\D/g, '')

    return name.includes(q) || phone.includes(q)
  })

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Mijozlar</Text>
        <Pressable style={styles.addIconBtn} onPress={() => setShowAdd((v) => !v)}>
          <Plus size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={theme.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Mijoz qidirish..."
          placeholderTextColor={theme.muted}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')}>
            <X size={18} color={theme.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <FilterPill theme={theme} active={filter === 'all'} label="Barchasi" onPress={() => setFilter('all')} />
        <FilterPill theme={theme} active={filter === 'debtors'} label="Qarzdorlar" onPress={() => setFilter('debtors')} />
        <FilterPill theme={theme} active={filter === 'paid'} label="To'langan" onPress={() => setFilter('paid')} />
      </View>

      {showAdd ? (
        <View style={styles.addCard}>
          <Text style={styles.addTitle}>Yangi mijoz</Text>
          <TextInput
            style={styles.input}
            value={formName}
            onChangeText={setFormName}
            placeholder="Mijoz ismi"
            placeholderTextColor={theme.muted}
          />
          <TextInput
            style={styles.input}
            value={formPhone}
            onChangeText={(v) => setFormPhone(formatPhoneNumber(v))}
            placeholder={PHONE_PREFIX + ' 90 123 45 67'}
            keyboardType="phone-pad"
            placeholderTextColor={theme.muted}
          />
          <Pressable style={styles.primaryBtn} onPress={handleAddCustomer} disabled={submitting}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Saqlash</Text>}
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id || item.customer_id || item.phone || index)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true)
          loadCustomers()
        }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>Mijoz topilmadi</Text>}
        renderItem={({ item }) => {
          const debt = getDebt(item)
          const isDebtor = debt > 0

          return (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{String(item.name || item.customer_name || '?').slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowName}>{item.name || item.customer_name || 'Mijoz'}</Text>
                <Text style={styles.rowPhone}>{item.phone || item.customer_phone || '-'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.amount, { color: isDebtor ? theme.danger : theme.success }]}>
                  {formatCurrency(debt)}
                </Text>
                <Text style={[styles.badge, { color: isDebtor ? theme.danger : theme.success }]}>
                  {isDebtor ? 'Qarzdor' : "To'langan"}
                </Text>
              </View>
            </View>
          )
        }}
      />
    </View>
  )
}

function FilterPill({ theme, active, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? theme.primary : theme.border,
        backgroundColor: active ? theme.primary : theme.card
      }}
    >
      <Text style={{ color: active ? '#fff' : theme.text, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  )
}

function getDebt(c) {
  return Number(c.remaining_amount ?? c.remaining_debts ?? c.debt_sum ?? c.balance ?? c.total_debt ?? 0)
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
      backgroundColor: theme.background,
      paddingHorizontal: 14,
      paddingTop: 14
    },
    loaderWrap: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center'
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    },
    addIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center'
    },
    searchWrap: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.card,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      marginBottom: 10
    },
    searchInput: {
      flex: 1,
      color: theme.text,
      fontSize: 15,
      paddingVertical: 10
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12
    },
    addCard: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.card,
      padding: 12,
      marginBottom: 12
    },
    addTitle: {
      color: theme.text,
      fontWeight: '700',
      fontSize: 15,
      marginBottom: 8
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
      color: theme.text,
      marginBottom: 8,
      backgroundColor: theme.mode === 'dark' ? '#0f172a' : '#fff'
    },
    primaryBtn: {
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
    emptyText: {
      textAlign: 'center',
      color: theme.muted,
      marginTop: 30
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: `${theme.primary}22`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    avatarText: {
      color: theme.primary,
      fontWeight: '700'
    },
    rowBody: {
      flex: 1
    },
    rowName: {
      color: theme.text,
      fontWeight: '600',
      fontSize: 14
    },
    rowPhone: {
      color: theme.muted,
      fontSize: 12,
      marginTop: 1
    },
    amount: {
      fontSize: 13,
      fontWeight: '700'
    },
    badge: {
      fontSize: 11,
      marginTop: 2
    }
  })
}
