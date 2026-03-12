import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { debtsApi } from '../api/debts.api'
import { paymentsApi } from '../api/payments.api'
import {
    Calendar, ArrowUpRight, ArrowDownRight,
    ChevronRight, History, Receipt, Clock, X, ChevronLeft
} from 'lucide-react'
import { Drawer } from 'vaul'
import LoadingSpinner from '../components/LoadingSpinner'
import { CustomersSkeleton } from '../components/Skeleton'
import { formatCurrency } from '../utils/format'

const MONTH_NAMES = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
]

export default function DebtsPage() {
    const [allDebts, setAllDebts] = useState([])
    const [allPayments, setAllPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear())

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [debtsData, paymentsData] = await Promise.all([
                debtsApi.getDebts({ per_page: 500 }),
                paymentsApi.getPayments({ per_page: 500 })
            ])
            setAllDebts(Array.isArray(debtsData) ? debtsData : (debtsData.data || []))
            setAllPayments(Array.isArray(paymentsData) ? paymentsData : (paymentsData.data || []))
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const yyyy = date.getFullYear()
        const hh = String(date.getHours()).padStart(2, '0')
        const min = String(date.getMinutes()).padStart(2, '0')
        return `${mm}/${dd}/${yyyy} ${hh}:${min}`
    }

    // Monthly stats calculation
    const monthlyStats = useMemo(() => {
        const [year, month] = selectedDate.split('-').map(Number)

        const debtsInMonth = allDebts.filter(d => {
            const date = new Date(d.created_at)
            return date.getFullYear() === year && (date.getMonth() + 1) === month
        })

        const paymentsInMonth = allPayments.filter(p => {
            const date = new Date(p.paid_at || p.created_at)
            return date.getFullYear() === year && (date.getMonth() + 1) === month
        })

        return {
            debts: debtsInMonth.reduce((sum, d) => sum + (parseFloat(d.total_amount) || 0), 0),
            payments: paymentsInMonth.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
        }
    }, [allDebts, allPayments, selectedDate])

    // Consolidated last 5 activities
    const combinedActivity = useMemo(() => {
        const debts = allDebts.map(d => ({ ...d, type: 'debt', date: new Date(d.created_at) }))
        const payments = allPayments.map(p => ({ ...p, type: 'payment', date: new Date(p.paid_at || p.created_at) }))

        return [...debts, ...payments]
            .sort((a, b) => b.date - a.date)
            .slice(0, 5)
    }, [allDebts, allPayments])

    const displayMonth = useMemo(() => {
        const [year, month] = selectedDate.split('-')
        return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
    }, [selectedDate])

    const handleSelectMonth = (monthIndex) => {
        const newDate = `${pickerYear}-${String(monthIndex + 1).padStart(2, '0')}`
        setSelectedDate(newDate)
        setShowDatePicker(false)
    }

    if (loading) {
        return <CustomersSkeleton />
    }

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-[28px] font-bold text-gray-900 dark:text-white">Hisobotlar</h1>
                <p className="text-gray-400 text-[14px]">Biznes tahlili va ko'rsatkichlar</p>
            </div>

            {/* Date Picker Section */}
            <div className="mb-6">
                <button
                    onClick={() => {
                        setPickerYear(parseInt(selectedDate.split('-')[0]))
                        setShowDatePicker(true)
                    }}
                    className="card w-full flex items-center justify-between p-4 active:scale-[0.98] transition-all text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Hisobot davri</p>
                            <p className="text-[17px] font-bold text-gray-900 dark:text-white">{displayMonth}</p>
                        </div>
                    </div>
                    <div className="p-2 text-gray-300">
                        <Calendar size={18} />
                    </div>
                </button>
            </div>

            {/* Drawer for Month Picker */}
            <Drawer.Root open={showDatePicker} onOpenChange={setShowDatePicker}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh] outline-none">
                        <div className="p-4 pb-8">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6" />

                            <div className="flex items-center justify-between mb-8 px-2">
                                <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                    Davrni tanlang
                                </Drawer.Title>
                                <button
                                    onClick={() => setShowDatePicker(false)}
                                    className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Year Selector */}
                            <div className="flex items-center justify-center gap-8 mb-8">
                                <button
                                    onClick={() => setPickerYear(prev => prev - 1)}
                                    className="p-2 text-gray-400 hover:text-blue-500"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <span className="text-[24px] font-black text-gray-900 dark:text-white tracking-tight">
                                    {pickerYear}
                                </span>
                                <button
                                    onClick={() => setPickerYear(prev => prev + 1)}
                                    className="p-2 text-gray-400 hover:text-blue-500"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>

                            {/* Months Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {MONTH_NAMES.map((name, index) => {
                                    const isSelected = selectedDate === `${pickerYear}-${String(index + 1).padStart(2, '0')}`
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => handleSelectMonth(index)}
                                            className={`py-4 rounded-2xl text-[15px] font-semibold transition-all active:scale-95 ${isSelected
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                                                }`}
                                        >
                                            {name}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* MONTHLY REPORT */}
            <div className="mb-8">
                <h2 className="section-title">OYLIK HISOBOT</h2>
                <div className="card bg-white dark:bg-gray-800 p-1">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <ArrowUpRight size={20} className="text-red-500" />
                            </div>
                            <div>
                                <p className="text-[14px] font-medium text-gray-900 dark:text-white">Berilgan nasiyalar</p>
                                <p className="text-[12px] text-gray-400">Sizga qarzdor</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[17px] font-bold text-red-500">{formatCurrency(monthlyStats.debts)}</p>
                            <p className="text-[11px] text-gray-400">so'm</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <ArrowDownRight size={20} className="text-green-500" />
                            </div>
                            <div>
                                <p className="text-[14px] font-medium text-gray-900 dark:text-white">Qabul qilingan to'lovlar</p>
                                <p className="text-[12px] text-gray-400">Mijozlardan olingan</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[17px] font-bold text-green-500">{formatCurrency(monthlyStats.payments)}</p>
                            <p className="text-[11px] text-gray-400">so'm</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SO'NGGI FAOLIYAT */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="section-title !mb-0">SO'NGGI FAOLIYAT</h2>
                    <Link to="/payments" className="text-[12px] font-semibold text-blue-500">Barchasi</Link>
                </div>
                {combinedActivity.length === 0 ? (
                    <div className="card text-center py-12 text-gray-400">
                        <Receipt size={40} className="mx-auto mb-2 opacity-20" />
                        <p>Faoliyat yo'q</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {combinedActivity.map((item) => (
                            <Link
                                key={`${item.type}-${item.id}`}
                                to={item.type === 'debt' ? `/debts/${item.id}` : `/debts/${item.debt_id}`}
                                className="card flex items-center gap-3 py-3 active:scale-[0.99] transition-transform"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'debt' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
                                    }`}>
                                    {item.type === 'debt' ? (
                                        <ArrowUpRight size={20} className="text-red-500" />
                                    ) : (
                                        <ArrowDownRight size={20} className="text-green-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[15px] font-bold text-gray-900 dark:text-white truncate">
                                        {item.customer?.name || item.debt?.customer?.name || 'Mijoz'}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                        <Clock size={12} />
                                        {formatDate(item.created_at || item.paid_at)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-[15px] font-bold ${item.type === 'debt' ? 'text-red-500' : 'text-green-500'}`}>
                                        {item.type === 'debt' ? '+' : ''}{formatCurrency(item.total_amount || item.amount)}
                                    </p>
                                    <p className="text-[10px] text-gray-400">so'm</p>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="h-24" />
        </div>
    )
}
