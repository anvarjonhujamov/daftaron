import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native'
import { ArrowDownRight, ArrowUpRight, Search } from 'lucide-react-native'
import { useFocusEffect } from '@react-navigation/native'
import paymentsApi from '../api/payments.api'
import debtsApi from '../api/debts.api'
import { useThemeMode } from '../context/ThemeContext'
import { formatCurrency, formatDate } from '../utils/format'

export default function HistoryScreen() {
  const { theme } = useThemeMode()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mode, setMode] = useState('payments')
  const [search, setSearch] = useState('')
  const [payments, setPayments] = useState([])
  const [debts, setDebts] = useState([])

  useFocusEffect(
    React.useCallback(() => {
      loadData()
    }, [])
  )

  async function loadData() {
    try {
      const [paymentsData, debtsData] = await Promise.all([
        paymentsApi.getPayments({ per_page: 500 }),
        debtsApi.getDebts({ per_page: 500 })
      ])

      setPayments(normalizeArray(paymentsData))
      setDebts(normalizeArray(debtsData))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const source = mode === 'payments' ? payments : debts

  const filtered = source
    .filter((item) => {
      const q = search.trim().toLowerCase()
      if (!q) return true

      const customer = String(item.customer_name || item.customer?.name || '').toLowerCase()
      const phone = String(item.customer_phone || item.customer?.phone || '').replace(/\D/g, '')
      const amount = String(item.amount || item.total_amount || '')
      const description = String(item.description || '').toLowerCase()

      return customer.includes(q) || phone.includes(q) || amount.includes(q) || description.includes(q)
    })
    .sort((a, b) => {
      const da = new Date(a.paid_at || a.created_at || a.debt_date || 0).getTime()
      const db = new Date(b.paid_at || b.created_at || b.debt_date || 0).getTime()
      return db - da
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
      <Text style={styles.title}>{mode === 'payments' ? "To'lovlar tarixi" : 'Nasiyalar tarixi'}</Text>

      <View style={styles.modeRow}>
        <ModeButton theme={theme} active={mode === 'payments'} label="To'lovlar" onPress={() => setMode('payments')} />
        <ModeButton theme={theme} active={mode === 'debts'} label="Nasiyalar" onPress={() => setMode('debts')} />
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color={theme.muted} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Qidirish..."
          placeholderTextColor={theme.muted}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id || item.payment_id || item.debt_id || index)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true)
          loadData()
        }} />}
        ListEmptyComponent={<Text style={styles.emptyText}>Ma'lumot topilmadi</Text>}
        renderItem={({ item }) => {
          const isPayment = mode === 'payments'
          const amount = Number(item.amount || item.total_amount || 0)

          return (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: isPayment ? `${theme.success}22` : `${theme.danger}22` }]}>
                {isPayment ? <ArrowDownRight color={theme.success} size={16} /> : <ArrowUpRight color={theme.danger} size={16} />}
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowName}>{item.customer_name || item.customer?.name || 'Mijoz'}</Text>
                <Text style={styles.rowSub}>{formatDate(item.paid_at || item.created_at || item.debt_date)}</Text>
              </View>
              <Text style={[styles.amount, { color: isPayment ? theme.success : theme.danger }]}>
                {formatCurrency(amount)}
              </Text>
            </View>
          )
        }}
      />
    </View>
  )
}

function ModeButton({ theme, active, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: active ? theme.primary : theme.border,
        backgroundColor: active ? theme.primary : theme.card
      }}
    >
      <Text style={{ color: active ? '#fff' : theme.text, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
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
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 10
    },
    modeRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10
    },
    searchWrap: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.card,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 10,
      marginBottom: 10
    },
    searchInput: {
      flex: 1,
      color: theme.text,
      fontSize: 14,
      paddingVertical: 10
    },
    emptyText: {
      textAlign: 'center',
      color: theme.muted,
      marginTop: 30
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingVertical: 11
    },
    iconWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10
    },
    rowBody: {
      flex: 1
    },
    rowName: {
      color: theme.text,
      fontSize: 14,
      fontWeight: '600'
    },
    rowSub: {
      color: theme.muted,
      fontSize: 12,
      marginTop: 1
    },
    amount: {
      fontSize: 13,
      fontWeight: '700'
    }
  })
}
