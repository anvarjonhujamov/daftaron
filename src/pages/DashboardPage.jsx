import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api/dashboard.api'
import {
    TrendingUp, TrendingDown, Users, ChevronRight,
    UserPlus, PieChart
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

export default function DashboardPage() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        try {
            const data = await dashboardApi.getStats()
            console.log('Dashboard stats mapping check:', data) // Debug for user console
            setStats(data)
        } catch (err) {
            console.error('Failed to load dashboard stats:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('uz-UZ').format(amount || 0)
    }

    // Robust field mapping based on user console output
    const totalCustomers = stats?.total_customers ?? stats?.totalCustomers ?? stats?.customers_count ?? 0

    // Qolgan qarz (Remaining Debt)
    const totalDebt = parseFloat(
        stats?.remaining_debts ?? stats?.remaining_debt ?? stats?.total_debt ??
        stats?.total_remaining ?? stats?.remaining_amount ?? 0
    )

    // To'langan summa (Total Paid)
    const totalPaid = parseFloat(
        stats?.total_payments ?? stats?.total_paid ?? stats?.total_paid_sum ??
        stats?.paid_sum ?? 0
    )

    // Umumiy nasiya (Total Given) - total_debts represents the total loan amount
    const totalGiven = parseFloat(
        stats?.total_debts ?? stats?.total_given ?? stats?.total_amount ??
        (totalDebt + totalPaid)
    )

    // Monthly Progress
    const monthlyPaid = parseFloat(
        stats?.payments_this_month ?? stats?.monthly_payments ??
        stats?.monthly_paid ?? stats?.paid_this_month ?? 0
    )

    // For the progress bar, if there's no explicit target, we can use a logical baseline
    const monthlyTotal = parseFloat(
        stats?.debts_this_month ?? stats?.monthly_debts ??
        ((totalGiven / 12) || 1)
    )

    const monthlyPercent = Math.min(Math.round((monthlyPaid / (monthlyTotal || 1)) * 100), 100) || 0

    const todayDebts = parseFloat(stats?.today_debts ?? stats?.today_given ?? 0)
    const todayPayments = parseFloat(stats?.today_payments ?? stats?.today_paid ?? 0)

    // Debtors/Customers list fallback
    const topDebtors = stats?.recent_customers ?? stats?.top_debtors ?? stats?.debtors ?? []

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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <p className="text-gray-500 dark:text-gray-400 text-[14px] mb-1">Xush kelibsiz</p>
                    <h1 className="text-[28px] font-bold text-gray-900 dark:text-white">Dashboard</h1>
                </div>
                <button className="text-[13px] text-blue-500 font-medium">Do'kon statistikasi</button>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="card dark:bg-gray-800 p-4 flex flex-col justify-between h-[100px]">
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">Jami mijozlar</p>
                    <p className="text-[24px] font-bold text-gray-900 dark:text-white">
                        {totalCustomers}
                    </p>
                </div>
                <div className="card dark:bg-gray-800 p-4 flex flex-col justify-between h-[100px]">
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">Umumiy nasiya</p>
                    <p className="text-[20px] font-bold text-gray-900 dark:text-white truncate">
                        {formatCurrency(totalGiven)}
                    </p>
                </div>
                <div className="card dark:bg-gray-800 p-4 flex flex-col justify-between h-[100px]">
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">Qolgan qarz</p>
                    <p className="text-[20px] font-bold text-red-500 truncate">
                        {formatCurrency(totalDebt)}
                    </p>
                </div>
                <div className="card dark:bg-gray-800 p-4 flex flex-col justify-between h-[100px]">
                    <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">To'langan summa</p>
                    <p className="text-[20px] font-bold text-green-500 truncate">
                        {formatCurrency(totalPaid)}
                    </p>
                </div>
            </div>

            {/* Top Debtors Quick Links */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Qarzdorlar</h2>
                    <Link to="/customers" className="text-blue-500 text-[14px] font-medium">Barchasi</Link>
                </div>

                {topDebtors?.length > 0 ? (
                    <div className="space-y-3">
                        {topDebtors.slice(0, 3).map((customer) => (
                            <Link
                                key={customer.id}
                                to={`/customers/${customer.id}`}
                                className="card flex items-center gap-3 active:scale-[0.98] transition-transform"
                            >
                                <div className="avatar avatar-md bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                    {customer.name?.charAt(0)?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
                                        {customer.name}
                                    </h3>
                                    <p className="text-[12px] text-gray-400 truncate">{customer.phone}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-[14px] font-bold text-red-500">
                                        {formatCurrency(customer.total_debt || customer.remaining_amount)}
                                    </div>
                                    <span className="text-[11px] text-gray-400">so'm</span>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 flex flex-col items-center gap-2">
                        <Users size={32} strokeWidth={1.5} />
                        <p className="text-[14px]">Qarzdorlar yo'q</p>
                    </div>
                )}
            </div>

            {/* Action Button - Fixed at bottom */}
            <div className="fixed bottom-20 left-0 right-0 p-4 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-md z-40 border-t border-gray-100 dark:border-gray-700 max-w-lg mx-auto">
                <Link
                    to="/customers"
                    state={{ openAddDrawer: true }}
                    className="btn btn-primary w-full shadow-lg shadow-blue-500/30 py-4"
                >
                    <UserPlus size={20} />
                    Yangi mijoz qo'shish
                </Link>
            </div>

            {/* Spacing for fixed button */}
            <div className="h-24" />
        </div>
    )
}
