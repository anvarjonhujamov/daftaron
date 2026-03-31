import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import debtsApi from '../api/debts.api'
import paymentsApi from '../api/payments.api'
import { useThemeMode } from '../context/ThemeContext'
import { formatCurrency, formatDate } from '../utils/format'

export default function ReportsScreen() {
  const { theme } = useThemeMode()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [monthlyDebts, setMonthlyDebts] = useState(0)
  const [monthlyPayments, setMonthlyPayments] = useState(0)
  const [activity, setActivity] = useState([])

  useFocusEffect(
    React.useCallback(() => {
      loadData()
    }, [])
  )

  async function loadData() {
    try {
      const [debtsRaw, paymentsRaw] = await Promise.all([
        debtsApi.getDebts({ per_page: 500 }),
        paymentsApi.getPayments({ per_page: 500 })
      ])

      const debts = normalizeArray(debtsRaw)
      const payments = normalizeArray(paymentsRaw)

      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth()

      const debtsThisMonth = debts.filter((d) => {
        const dt = new Date(d.created_at || d.debt_date || 0)
        return dt.getFullYear() === y && dt.getMonth() === m
      })

      const paymentsThisMonth = payments.filter((p) => {
        const dt = new Date(p.paid_at || p.created_at || 0)
        return dt.getFullYear() === y && dt.getMonth() === m
      })

      const debtSum = debtsThisMonth.reduce((sum, d) => sum + Number(d.total_amount || d.amount || 0), 0)
      const paymentSum = paymentsThisMonth.reduce((sum, p) => sum + Number(p.amount || 0), 0)

      setMonthlyDebts(debtSum)
      setMonthlyPayments(paymentSum)

      const combined = [
        ...debts.map((d) => ({
          id: `d-${d.id}`,
          type: 'debt',
          customer_name: d.customer_name || d.customer?.name || 'Mijoz',
          amount: Number(d.total_amount || d.amount || 0),
          date: d.created_at || d.debt_date
        })),
        ...payments.map((p) => ({
          id: `p-${p.id}`,
          type: 'payment',
          customer_name: p.customer_name || p.customer?.name || 'Mijoz',
          amount: Number(p.amount || 0),
          date: p.paid_at || p.created_at
        }))
      ]
        .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
        .slice(0, 20)

      setActivity(combined)
    } finally {
      setLoading(false)
      setRefreshing(false)
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
    <View style={styles.container}>
      <Text style={styles.title}>Hisobotlar</Text>
      <Text style={styles.sub}>Joriy oy bo'yicha ko'rsatkichlar</Text>

      <View style={styles.cardsRow}>
        <View style={[styles.card, { borderColor: theme.border }]}> 
          <Text style={styles.cardLabel}>Berilgan nasiyalar</Text>
          <Text style={[styles.cardValue, { color: theme.danger }]}>{formatCurrency(monthlyDebts)} so'm</Text>
        </View>
        <View style={[styles.card, { borderColor: theme.border }]}> 
          <Text style={styles.cardLabel}>Qabul qilingan to'lovlar</Text>
          <Text style={[styles.cardValue, { color: theme.success }]}>{formatCurrency(monthlyPayments)} so'm</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>So'nggi faoliyat</Text>
      <FlatList
        data={activity}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
          setRefreshing(true)
          loadData()
        }} />}
        ListEmptyComponent={<Text style={styles.empty}>Faoliyat topilmadi</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: item.type === 'payment' ? theme.success : theme.danger }]} />
            <View style={styles.rowBody}>
              <Text style={styles.rowName}>{item.customer_name}</Text>
              <Text style={styles.rowSub}>{formatDate(item.date)}</Text>
            </View>
            <Text style={[styles.rowAmount, { color: item.type === 'payment' ? theme.success : theme.danger }]}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
        )}
      />
    </View>
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
      color: theme.text,
      fontSize: 22,
      fontWeight: '700'
    },
    sub: {
      color: theme.muted,
      marginTop: 3,
      marginBottom: 10,
      fontSize: 13
    },
    cardsRow: {
      gap: 10,
      marginBottom: 14
    },
    card: {
      borderWidth: 1,
      borderRadius: 12,
      backgroundColor: theme.card,
      padding: 12
    },
    cardLabel: {
      color: theme.muted,
      fontSize: 12
    },
    cardValue: {
      marginTop: 4,
      fontWeight: '700',
      fontSize: 16
    },
    sectionTitle: {
      color: theme.text,
      fontWeight: '700',
      fontSize: 16,
      marginBottom: 8
    },
    empty: {
      color: theme.muted,
      textAlign: 'center',
      marginTop: 30
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingVertical: 10
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
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
    rowAmount: {
      fontSize: 13,
      fontWeight: '700'
    }
  })
}
