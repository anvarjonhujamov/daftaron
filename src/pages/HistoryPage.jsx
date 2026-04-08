import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { paymentsApi } from '../api/payments.api'
import { debtsApi } from '../api/debts.api'
import {
    History, ArrowLeft, Search, Calendar,
    ArrowDownRight, ChevronRight, Receipt,
    TrendingDown, TrendingUp, Clock
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { CustomersSkeleton } from '../components/Skeleton'
import { formatCurrency } from '../utils/format'

export default function HistoryPage() {
    const [mode, setMode] = useState('payments') // 'payments' or 'debts'
    const [payments, setPayments] = useState([])
    const [debts, setDebts] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [displayLimit, setDisplayLimit] = useState(50)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [paymentsData, debtsData] = await Promise.all([
                paymentsApi.getPayments({ per_page: 500 }),
                debtsApi.getDebts({ per_page: 500 })
            ])

            setPayments(Array.isArray(paymentsData) ? paymentsData : (paymentsData.data || []))
            setDebts(Array.isArray(debtsData) ? debtsData : (debtsData.data || []))
        } catch (err) {
            console.error('Failed to load history data:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)

        // MM/DD/YYYY format
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const yyyy = date.getFullYear()

        const hh = String(date.getHours()).padStart(2, '0')
        const min = String(date.getMinutes()).padStart(2, '0')

        return `${mm}/${dd}/${yyyy} ${hh}:${min}`
    }

    const activeItems = useMemo(() => {
        const items = mode === 'payments' ? payments : debts

        // Enhanced Search
        const filtered = items.filter(item => {
            const query = searchQuery.toLowerCase()
            const customerName = (item.customer?.name || item.debt?.customer?.name || '').toLowerCase()
            const customerPhone = (item.customer?.phone || item.debt?.customer?.phone || '').toLowerCase()
            const amount = (item.amount || item.total_amount || '').toString()
            const note = (item.note || item.description || '').toLowerCase()

            return customerName.includes(query) ||
                customerPhone.includes(query) ||
                amount.includes(query) ||
                note.includes(query)
        })

        // Sort by date descending
        return filtered.sort((a, b) => {
            const dateA = new Date(a.paid_at || a.created_at)
            const dateB = new Date(b.paid_at || b.created_at)
            return dateB - dateA
        })
    }, [mode, payments, debts, searchQuery])

    const displayedItems = activeItems.slice(0, displayLimit)

    // Group items by date for display
    const groupedItems = displayedItems.reduce((groups, item) => {
        const dateObj = new Date(item.paid_at || item.created_at)
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
        const dd = String(dateObj.getDate()).padStart(2, '0')
        const yyyy = dateObj.getFullYear()
        const date = `${mm}/${dd}/${yyyy}`

        if (!groups[date]) groups[date] = []
        groups[date].push(item)
        return groups
    }, {})

    if (loading) {
        return <CustomersSkeleton />
    }

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link to="/" className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                </Link>
                <div>
                    <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">
                        {mode === 'payments' ? "To'lovlar tarixi" : "Nasiyalar tarixi"}
                    </h1>
                    <p className="text-gray-400 text-[13px]">
                        {mode === 'payments' ? "Barcha qabul qilingan to'lovlar" : "Barcha berilgan nasiyalar"}
                    </p>
                </div>
            </div>

            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6">
                <button
                    onClick={() => { setMode('payments'); setDisplayLimit(50); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold transition-all ${mode === 'payments'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/20'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <TrendingDown size={16} />
                    To'lovlar
                </button>
                <button
                    onClick={() => { setMode('debts'); setDisplayLimit(50); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold transition-all ${mode === 'debts'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <TrendingUp size={16} />
                    Nasiyalar
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Qidiruv (ism, summa, telefon...)"
                    className="input pl-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Content List */}
            <div className="space-y-6">
                {activeItems.length === 0 ? (
                    <div className="card text-center py-12 text-gray-400">
                        <Receipt size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Ma'lumotlar topilmadi</p>
                    </div>
                ) : (
                    Object.entries(groupedItems).map(([date, items]) => (
                        <div key={date}>
                            <h2 className="section-title mb-3 flex items-center gap-2">
                                <Calendar size={14} />
                                {date}
                            </h2>
                            <div className="space-y-2">
                                {items.map((item) => (
                                    <div key={item.id} className="card relative overflow-hidden active:scale-[0.99] transition-transform">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'payments' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                                                }`}>
                                                {mode === 'payments' ? (
                                                    <TrendingDown size={20} className="text-green-500" />
                                                ) : (
                                                    <TrendingUp size={20} className="text-red-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <h3 className="text-[15px] font-bold text-gray-900 dark:text-white truncate">
                                                        {item.customer?.name || item.debt?.customer?.name || 'Mijoz'}
                                                    </h3>
                                                    <span className={`text-[15px] font-bold whitespace-nowrap ${mode === 'payments' ? 'text-green-500' : 'text-red-500'}`}>
                                                        {formatCurrency(item.amount || item.total_amount)} <small className="text-[10px]">so'm</small>
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-gray-400">
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {formatDate(item.paid_at || item.created_at)}
                                                    </div>
                                                    {item.customer?.phone && (
                                                        <span>{item.customer.phone}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Simple underline-like status indicator at the direct card edge if needed */}
                                        <div className={`absolute bottom-0 left-0 h-1 rounded-full ${mode === 'payments' ? 'bg-green-500/20' : 'bg-red-500/20'}`} style={{ width: '100%' }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Load More Button */}
            {activeItems.length > displayLimit && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={() => setDisplayLimit(prev => prev + 50)}
                        className="btn btn-secondary w-full max-w-xs"
                    >
                        Yana 50 tasini ko'rish
                    </button>
                </div>
            )}

            <div className="h-24" />
        </div>
    )
}
