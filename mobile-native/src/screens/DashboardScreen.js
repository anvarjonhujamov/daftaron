import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Activity, CheckCircle2, TrendingUp, Users } from 'lucide-react-native'
import dashboardApi from '../api/dashboard.api'
import { useThemeMode } from '../context/ThemeContext'
import { formatCurrency } from '../utils/format'

const statMeta = [
  { key: 'total_customers', title: 'Jami mijozlar', icon: Users, color: '#3B82F6' },
  { key: 'total_debts', title: 'Umumiy nasiya', icon: TrendingUp, color: '#F97316' },
  { key: 'remaining_debts', title: 'Qolgan qarz', icon: Activity, color: '#EF4444' },
  { key: 'total_payments', title: "To'langan summa", icon: CheckCircle2, color: '#22C55E' }
]

export default function DashboardScreen({ navigation }) {
  const { theme } = useThemeMode()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({})
  const [recentCustomers, setRecentCustomers] = useState([])

  const loadStats = useCallback(async () => {
    try {
      const data = await dashboardApi.getStats()
      setStats(data || {})
      setRecentCustomers(normalizeArray(data?.recent_customers))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadStats()
    }, [loadStats])
  )

  if (loading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
        setRefreshing(true)
        loadStats()
      }} />}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Daftaron</Text>
      <Text style={styles.subtitle}>Nasiya boshqaruvi tizimi</Text>

      <View style={styles.grid}>
        {statMeta.map((item) => {
          const Icon = item.icon
          const rawValue = Number(stats[item.key] || 0)
          const value = item.key === 'total_customers' ? rawValue : `${formatCurrency(rawValue)} so'm`

          return (
            <View key={item.key} style={styles.statCard}>
              <View style={[styles.iconBubble, { backgroundColor: `${item.color}22` }]}>
                <Icon size={18} color={item.color} />
              </View>
              <Text style={styles.statTitle}>{item.title}</Text>
              <Text style={styles.statValue}>{value}</Text>
            </View>
          )
        })}
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Qarzdorlar</Text>
        <Pressable onPress={() => navigation.navigate('Mijozlar')}>
          <Text style={styles.link}>Barchasi</Text>
        </Pressable>
      </View>

      {recentCustomers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Hozircha mijozlar yo'q</Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          {recentCustomers.slice(0, 5).map((item) => {
            const debt = Number(
              item.remaining_amount ?? item.remaining_debts ?? item.debt_sum ?? item.total_debt ?? 0
            )
            return (
              <View key={item.id || item.customer_id || item.phone} style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{String(item.name || item.customer_name || '?').slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{item.name || item.customer_name || 'Mijoz'}</Text>
                  <Text style={styles.rowPhone}>{item.phone || item.customer_phone || '-'}</Text>
                </View>
                <Text style={[styles.rowAmount, { color: debt > 0 ? theme.danger : theme.success }]}>
                  {formatCurrency(debt)}
                </Text>
              </View>
            )
          })}
        </View>
      )}
    </ScrollView>
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
    content: {
      padding: 16,
      paddingBottom: 26
    },
    loaderWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: theme.text
    },
    subtitle: {
      marginTop: 4,
      color: theme.muted,
      fontSize: 14
    },
    grid: {
      marginTop: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10
    },
    statCard: {
      width: '48.5%',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 12
    },
    iconBubble: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10
    },
    statTitle: {
      color: theme.muted,
      fontSize: 12,
      marginBottom: 3
    },
    statValue: {
      color: theme.text,
      fontSize: 15,
      fontWeight: '700'
    },
    sectionHead: {
      marginTop: 18,
      marginBottom: 10,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text
    },
    link: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '600'
    },
    emptyCard: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 16,
      backgroundColor: theme.card
    },
    emptyText: {
      color: theme.muted,
      textAlign: 'center'
    },
    listWrap: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.card,
      overflow: 'hidden'
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
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
      fontSize: 14,
      fontWeight: '600'
    },
    rowPhone: {
      color: theme.muted,
      fontSize: 12,
      marginTop: 2
    },
    rowAmount: {
      fontWeight: '700',
      fontSize: 13
    }
  })
}
