import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { Picker } from '@react-native-picker/picker'
import debtsApi from '../api/debts.api'
import paymentsApi from '../api/payments.api'
import { useThemeMode } from '../context/ThemeContext'
import { formatCurrency, formatDate } from '../utils/format'

export default function ReportsScreen() {
  const { theme } = useThemeMode()
  const styles = useMemo(() => createStyles(theme), [theme])
  const now = new Date()
  const [selectedMonthDate, setSelectedMonthDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  )
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false)
  const [draftYear, setDraftYear] = useState(now.getFullYear())
  const [draftMonth, setDraftMonth] = useState(now.getMonth())

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [monthlyDebts, setMonthlyDebts] = useState(0)
  const [monthlyPayments, setMonthlyPayments] = useState(0)
  const [activity, setActivity] = useState([])

  useFocusEffect(
    React.useCallback(() => {
      loadData()
    }, [selectedMonthDate])
  )

  async function loadData() {
    try {
      const [debtsRaw, paymentsRaw] = await Promise.all([
        debtsApi.getDebts({ per_page: 500 }),
        paymentsApi.getPayments({ per_page: 500 })
      ])

      const debts = normalizeArray(debtsRaw)
      const payments = normalizeArray(paymentsRaw)

      const startDate = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth(), 1, 0, 0, 0, 0)
      const endDate = new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 0, 23, 59, 59, 999)

      const debtsThisMonth = debts.filter((d) => {
        const dt = new Date(d.created_at || d.debt_date || 0)
        return !Number.isNaN(dt.getTime()) && dt >= startDate && dt <= endDate
      })

      const paymentsThisMonth = payments.filter((p) => {
        const dt = new Date(p.paid_at || p.created_at || 0)
        return !Number.isNaN(dt.getTime()) && dt >= startDate && dt <= endDate
      })

      const debtSum = debtsThisMonth.reduce((sum, d) => sum + Number(d.total_amount || d.amount || 0), 0)
      const paymentSum = paymentsThisMonth.reduce((sum, p) => sum + Number(p.amount || 0), 0)

      setMonthlyDebts(debtSum)
      setMonthlyPayments(paymentSum)

      const combined = [
        ...debtsThisMonth.map((d) => ({
          id: `d-${d.id}`,
          type: 'debt',
          customer_name: d.customer_name || d.customer?.name || 'Mijoz',
          amount: Number(d.total_amount || d.amount || 0),
          date: d.created_at || d.debt_date
        })),
        ...paymentsThisMonth.map((p) => ({
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

  const periodLabel = formatMonthYear(selectedMonthDate)
  const currentMonthRef = new Date()
  const isCurrentMonth =
    selectedMonthDate.getFullYear() === currentMonthRef.getFullYear() &&
    selectedMonthDate.getMonth() === currentMonthRef.getMonth()

  const yearOptions = buildYearOptions(now.getFullYear())

  const openPeriodModal = () => {
    setDraftYear(selectedMonthDate.getFullYear())
    setDraftMonth(selectedMonthDate.getMonth())
    setIsPeriodModalOpen(true)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hisobotlar</Text>
      <Text style={styles.sub}>Siz tanlagan davr bo'yicha ko'rsatkichlar</Text>

      <TouchableOpacity style={styles.periodCard} onPress={openPeriodModal} activeOpacity={0.85}>
        <View>
          <Text style={styles.periodLabel}>HISOBOT DAVRI</Text>
          <Text style={styles.periodValue}>
            {periodLabel}
            {isCurrentMonth ? " (joriy oy)" : ''}
          </Text>
        </View>
        <Text style={styles.periodAction}>O'zgartirish</Text>
      </TouchableOpacity>

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

      <Modal
        transparent
        animationType="fade"
        visible={isPeriodModalOpen}
        onRequestClose={() => setIsPeriodModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hisobot davrini tanlang</Text>

            <Text style={styles.modalFieldLabel}>Oy</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={draftMonth} onValueChange={(v) => setDraftMonth(v)}>
                {UZ_MONTHS.map((name, index) => (
                  <Picker.Item key={name} label={name} value={index} />
                ))}
              </Picker>
            </View>

            <Text style={styles.modalFieldLabel}>Yil</Text>
            <View style={styles.pickerWrap}>
              <Picker selectedValue={draftYear} onValueChange={(v) => setDraftYear(v)}>
                {yearOptions.map((year) => (
                  <Picker.Item key={String(year)} label={String(year)} value={year} />
                ))}
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsPeriodModalOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={() => {
                  setSelectedMonthDate(new Date(draftYear, draftMonth, 1))
                  setIsPeriodModalOpen(false)
                }}
              >
                <Text style={styles.saveButtonText}>Saqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function normalizeArray(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  return []
}

const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
]

function formatMonthYear(date) {
  return `${UZ_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function buildYearOptions(currentYear) {
  const years = []
  for (let y = currentYear + 1; y >= currentYear - 5; y -= 1) {
    years.push(y)
  }
  return years
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
    periodCard: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.card,
      padding: 12,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    periodLabel: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '700'
    },
    periodValue: {
      color: theme.text,
      fontSize: 17,
      fontWeight: '700',
      marginTop: 2
    },
    periodAction: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '600'
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
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      paddingHorizontal: 16
    },
    modalContent: {
      borderRadius: 16,
      backgroundColor: theme.card,
      padding: 14
    },
    modalTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 12
    },
    modalFieldLabel: {
      color: theme.muted,
      fontSize: 12,
      marginBottom: 4,
      marginTop: 6
    },
    pickerWrap: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      overflow: 'hidden'
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
      marginTop: 14
    },
    modalButton: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 9
    },
    cancelButton: {
      backgroundColor: theme.background
    },
    saveButton: {
      backgroundColor: theme.primary
    },
    cancelButtonText: {
      color: theme.muted,
      fontWeight: '600'
    },
    saveButtonText: {
      color: '#fff',
      fontWeight: '700'
    }
  })
}
