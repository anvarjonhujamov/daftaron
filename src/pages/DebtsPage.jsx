import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api/dashboard.api'
import { customersApi } from '../api/customers.api'
import { debtsApi } from '../api/debts.api'
import {
    TrendingUp, TrendingDown, Users, Calendar,
    ArrowUpRight, ArrowDownRight, ChevronRight
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

export default function DebtsPage() {
    const [stats, setStats] = useState(null)
    const [customers, setCustomers] = useState([])
    const [recentDebts, setRecentDebts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [statsData, customersData, debtsData] = await Promise.all([
                dashboardApi.getStats(),
                customersApi.getCustomers({ per_page: 100 }),
                debtsApi.getDebts({ per_page: 10 })
            ])
            setStats(statsData)
            setCustomers(customersData.data || [])
            setRecentDebts(debtsData.data || [])
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('uz-UZ').format(amount || 0)
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toLocaleDateString('uz-UZ', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const totalDebt = stats?.total_debt || stats?.totalDebt || 0
    const totalCustomers = customers.length
    const debtorsCount = customers.filter(c => parseFloat(c.total_debt) > 0).length
    const paidCount = customers.filter(c => parseFloat(c.total_debt) <= 0 || !c.total_debt).length
    const weeklyDebts = stats?.weekly_debts || stats?.today_debts || 0
    const weeklyPayments = stats?.weekly_payments || stats?.today_payments || 0

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-[28px] font-bold text-gray-900 dark:text-white">Hisobotlar</h1>
                <p className="text-gray-400 text-[14px]">Biznes ko'rsatkichlari va tahlil</p>
            </div>

            {/* UMUMIY MA'LUMOT */}
            <div className="mb-6">
                <h2 className="section-title">UMUMIY MA'LUMOT</h2>
                <div className="flex gap-3">
                    <div className="flex-1 card border-l-4 border-l-blue-500">
                        <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-1">Umumiy qarz</p>
                        <p className="text-[22px] font-bold text-blue-500">{formatCurrency(totalDebt)}</p>
                        <p className="text-[13px] text-gray-400">so'm</p>
                    </div>
                    <div className="flex-1 card">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[13px] text-gray-500 dark:text-gray-400">Jami mijozlar</p>
                            <Users size={18} className="text-gray-400" />
                        </div>
                        <p className="text-[28px] font-bold text-gray-900 dark:text-white">{totalCustomers}</p>
                    </div>
                </div>
            </div>

            {/* BU HAFTA */}
            <div className="mb-6">
                <h2 className="section-title">BU HAFTA</h2>
                <div className="card">
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                        <Calendar size={18} className="text-gray-400" />
                        <span className="text-[15px] font-semibold text-gray-900 dark:text-white">Haftalik hisobot</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <ArrowUpRight size={16} className="text-red-500" />
                            </div>
                            <div>
                                <p className="text-[14px] font-medium text-gray-900 dark:text-white">Berilgan nasiyalar</p>
                                <p className="text-[12px] text-gray-400">Sizga qarzdor</p>
                            </div>
                        </div>
                        <p className="text-[15px] font-bold text-red-500">{formatCurrency(weeklyDebts)} so'm</p>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <ArrowDownRight size={16} className="text-green-500" />
                            </div>
                            <div>
                                <p className="text-[14px] font-medium text-gray-900 dark:text-white">Qabul qilingan to'lovlar</p>
                                <p className="text-[12px] text-gray-400">Mijozlardan olingan</p>
                            </div>
                        </div>
                        <p className="text-[15px] font-bold text-green-500">{formatCurrency(weeklyPayments)} so'm</p>
                    </div>
                </div>
            </div>

            {/* MIJOZLAR TAHLILI */}
            <div className="mb-6">
                <h2 className="section-title">MIJOZLAR TAHLILI</h2>
                <div className="flex gap-3">
                    <Link to="/customers?filter=debtors" className="flex-1 card border-l-4 border-l-red-500">
                        <p className="text-[36px] font-bold text-red-500">{debtorsCount}</p>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400">Qarzdorlar</p>
                    </Link>
                    <Link to="/customers?filter=paid" className="flex-1 card border-l-4 border-l-green-500">
                        <p className="text-[36px] font-bold text-green-500">{paidCount}</p>
                        <p className="text-[13px] text-gray-500 dark:text-gray-400">To'langan</p>
                    </Link>
                </div>
            </div>

            {/* SO'NGGI FAOLIYAT */}
            <div>
                <h2 className="section-title">SO'NGGI FAOLIYAT</h2>
                {recentDebts.length === 0 ? (
                    <div className="card text-center py-8 text-gray-400">Faoliyat yo'q</div>
                ) : (
                    <div className="space-y-2">
                        {recentDebts.slice(0, 5).map((debt) => (
                            <Link key={debt.id} to={`/debts/${debt.id}`} className="card flex items-center gap-3 py-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${debt.status === 'open' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
                                    }`}>
                                    {debt.status === 'open' ? (
                                        <ArrowUpRight size={16} className="text-red-500" />
                                    ) : (
                                        <ArrowDownRight size={16} className="text-green-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px] font-medium text-gray-900 dark:text-white truncate">
                                        {debt.customer?.name || 'Mijoz'}
                                    </p>
                                    <p className="text-[12px] text-gray-400">{formatDate(debt.created_at)}</p>
                                </div>
                                <p className={`text-[14px] font-bold ${debt.status === 'open' ? 'text-red-500' : 'text-green-500'}`}>
                                    {debt.status === 'open' ? '+' : ''}{formatCurrency(debt.total_amount)} so'm
                                </p>
                                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
