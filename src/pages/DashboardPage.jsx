import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api/dashboard.api'
import { customersApi } from '../api/customers.api'
import { debtsApi } from '../api/debts.api'
import { notificationsApi } from '../api/notifications.api'
import { paymentsApi } from '../api/payments.api'
import { profileApi } from '../api/profile.api'
import {
    TrendingUp, Users, ChevronRight,
    UserPlus, Activity, CheckCircle2, History, Bell, ArrowDown, ArrowUp
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import Skeleton, { DashboardSkeleton } from '../components/Skeleton'
import { formatCurrency } from '../utils/format'
import { useSubscription } from '../contexts/SubscriptionProvider'

export default function DashboardPage() {
    const [stats, setStats] = useState(null)
    const [customers, setCustomers] = useState([])
    const [allDebts, setAllDebts] = useState([])
    const [allPayments, setAllPayments] = useState([])
    const [unreadNotifs, setUnreadNotifs] = useState(0)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)

    useEffect(() => {
        loadStats()
    }, [])

    const loadStats = async () => {
        setLoading(true)
        try {
            const [statsData, customersData, debtsData, notifsData, paymentsData] = await Promise.allSettled([
                dashboardApi.getStats(),
                customersApi.getCustomers(),
                debtsApi.getDebts(),
                notificationsApi.getNotifications(),
                paymentsApi.getPayments()
            ])

            if (statsData.status === 'fulfilled') {
                setStats(statsData.value)
            }

            if (customersData.status === 'fulfilled') {
                const data = customersData.value
                setCustomers(Array.isArray(data) ? data : (data.data || []))
            }

            if (debtsData.status === 'fulfilled') {
                const data = debtsData.value
                setAllDebts(Array.isArray(data) ? data : (data.data || []))
            }

            if (notifsData.status === 'fulfilled') {
                const data = notifsData.value
                const list = Array.isArray(data) ? data : (data.data || [])
                setUnreadNotifs(list.filter(n => !n.read_at).length)
            }

            if (paymentsData.status === 'fulfilled') {
                const data = paymentsData.value
                setAllPayments(Array.isArray(data) ? data : (data.data || []))
            }
        } catch (err) {
            console.error('Failed to load dashboard data:', err)
        } finally {
            setLoading(false)
        }

        // Try to load user from localStorage
        try {
            const stored = localStorage.getItem('user')
            if (stored) {
                setUser(JSON.parse(stored))
            } else {
                // If not in storage, fetch from API
                const profileData = await profileApi.getProfile()
                const userData = profileData.user || profileData.data || profileData
                setUser(userData)
                localStorage.setItem('user', JSON.stringify(userData))
            }
        } catch (e) {
            console.error('Failed to load user info:', e)
        }
    }

    // Robust field mapping based on user console output
    const totalCustomers = stats?.total_customers ?? stats?.totalCustomers ?? stats?.customers_count ?? 0

    // Qolgan qarz (Remaining Debt)
    const totalDebt = parseFloat(
        stats?.remaining_debts ?? stats?.remaining_debt ??
        stats?.total_remaining ?? stats?.remaining_amount ??
        stats?.total_debt ?? 0
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

    // Today's stats — calculate from real debts and payments data in local time
    const todayRaw = new Date();
    const offset = todayRaw.getTimezoneOffset() * 60000;
    const todayStr = new Date(todayRaw - offset).toISOString().split('T')[0];

    // Bugun nasiya (Today's Debts)
    const todayDebts = (() => {
        const val = stats?.today_debts ?? stats?.today_given ?? stats?.today_debt_amount ?? stats?.today_amount ?? stats?.today_nasiya;
        if (val !== undefined && val !== null) {
            return parseFloat(val) || 0;
        }

        // Fallback to client-side filtering
        return allDebts
            .filter(d => {
                const dateStr = d.created_at || d.debt_date;
                if (!dateStr) return false;
                try {
                    const dt = new Date(dateStr);
                    const localStr = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    return localStr === todayStr;
                } catch (e) { return false; }
            })
            .reduce((sum, d) => sum + parseFloat(d.remaining_amount ?? d.remaining_debts ?? d.amount ?? d.total_amount ?? d.debt_amount ?? d.price ?? 0), 0)
    })()

    // Bugun to'lov (Today's Payments)
    const todayPayments = (() => {
        const val = stats?.today_payments ?? stats?.today_paid ?? stats?.today_paid_amount ?? stats?.today_payment ?? stats?.today_tolov;
        if (val !== undefined && val !== null) {
            return parseFloat(val) || 0;
        }

        // Fallback to client-side filtering via allPayments
        return allPayments
            .filter(p => {
                const dateStr = p.created_at || p.paid_at || p.payment_date;
                if (!dateStr) return false;
                try {
                    const dt = new Date(dateStr);
                    const localStr = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                    return localStr === todayStr;
                } catch (e) { return false; }
            })
            .reduce((sum, p) => sum + parseFloat(p.amount || p.paid_amount || 0), 0)
    })()

    // Debtors/Customers list source - prefer fetched customers for consistency
    const debtorsSource = customers.length > 0
        ? customers
        : (stats?.recent_customers ?? stats?.top_debtors ?? stats?.debtors ?? [])

    const topDebtors = debtorsSource
        .map(customer => ({
            ...customer,
            computed_debt: parseFloat(customer.remaining_amount ?? customer.remaining_debts ?? customer.debt_sum ?? customer.balance ?? customer.total_debt ?? 0)
        }))
        .sort((a, b) => b.computed_debt - a.computed_debt) // Descending order

    const { remaining, status: subStatus } = useSubscription()

    if (loading) {
        return <DashboardSkeleton />
    }

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex items-center justify-center shrink-0">
                        <img src="/logo.png" alt="Daftaron" className="w-7 h-7 object-contain" />
                    </div>
                    <h1 className="text-[24px] font-bold text-gray-900 dark:text-white truncate">
                        {user?.tenant_name || user?.shop_name || user?.tenant?.name || 'Daftaron'}
                    </h1>
                </div>
                
                {remaining != null && (
                    <div className={`px-3 py-1.5 rounded-full text-[12px] font-bold shadow-sm transition-colors ${subStatus === 'expired'
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : remaining < 10
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                        {subStatus === 'expired' ? (
                            'Obuna tugagan'
                        ) : (
                            `Limit: ${remaining ?? 0} ta`
                        )}
                    </div>
                )}

                <div className="flex gap-2">
                    <Link
                        to="/notifications"
                        className="relative w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-sm text-gray-500 active:scale-95 transition-all"
                        title="Bildirishnomalar"
                    >
                        <Bell size={22} />
                        {unreadNotifs > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-1 ring-white dark:ring-gray-800">
                                {unreadNotifs > 99 ? '99+' : unreadNotifs}
                            </span>
                        )}
                    </Link>
                    <Link
                        to="/payments"
                        className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-sm text-gray-500 active:scale-95 transition-all"
                        title="To'lovlar tarixi"
                    >
                        <History size={22} />
                    </Link>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {/* Jami mijozlar */}
                <div className="relative overflow-hidden rounded-[20px] p-4 h-[100px] bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all">
                    <div className="relative z-10 flex flex-col justify-between h-full text-white">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium opacity-90">Jami mijozlar</span>
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <Users size={16} className="text-white" />
                            </div>
                        </div>
                        <p className="text-[24px] font-bold leading-none">{totalCustomers}</p>
                    </div>
                </div>

                {/* Umumiy nasiya */}
                <div className="relative overflow-hidden rounded-[20px] p-4 h-[100px] bg-gradient-to-br from-orange-400 to-rose-500 shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all">
                    <div className="relative z-10 flex flex-col justify-between h-full text-white">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium opacity-90">Umumiy nasiya</span>
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <TrendingUp size={16} className="text-white" />
                            </div>
                        </div>
                        <p className="text-[18px] font-bold leading-none truncate">{formatCurrency(totalGiven)}</p>
                    </div>
                </div>

                {/* Qolgan qarz */}
                <div className="relative overflow-hidden rounded-[20px] p-4 h-[100px] bg-gradient-to-br from-rose-500 to-red-700 shadow-lg shadow-rose-500/20 active:scale-[0.98] transition-all">
                    <div className="relative z-10 flex flex-col justify-between h-full text-white">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium opacity-90">Qolgan qarz</span>
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <Activity size={16} className="text-white" />
                            </div>
                        </div>
                        <p className="text-[18px] font-bold leading-none truncate">{formatCurrency(totalDebt)}</p>
                    </div>
                </div>

                {/* To'langan summa */}
                <div className="relative overflow-hidden rounded-[20px] p-4 h-[100px] bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all">
                    <div className="relative z-10 flex flex-col justify-between h-full text-white">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium opacity-90">To'langan summa</span>
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <CheckCircle2 size={16} className="text-white" />
                            </div>
                        </div>
                        <p className="text-[18px] font-bold leading-none truncate">{formatCurrency(totalPaid)}</p>
                    </div>
                </div>
            </div>

            {/* Today Stats */}
            <div className="flex gap-3 mb-6">
                <div className="flex-1 card dark:bg-gray-800 flex items-center gap-3 !p-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <ArrowDown size={16} className="text-red-500" />
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-400">Bugun nasiya</p>
                        <p className="text-[14px] font-bold text-red-500">{formatCurrency(todayDebts)}</p>
                    </div>
                </div>
                <div className="flex-1 card dark:bg-gray-800 flex items-center gap-3 !p-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <ArrowUp size={16} className="text-green-500" />
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-400">Bugun to'lov</p>
                        <p className="text-[14px] font-bold text-green-500">{formatCurrency(todayPayments)}</p>
                    </div>
                </div>
            </div>

            {/* Top Debtors Quick Links */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Eng ko'p qarzdorlar</h2>
                </div>

                {topDebtors?.length > 0 ? (
                    <div className="relative">
                        <div className="space-y-2">
                            {topDebtors
                                .filter(customer => customer.computed_debt > 0)
                                .slice(0, 3)
                                .map((customer, index, arr) => (
                                    <Link
                                        key={customer.id}
                                        to={`/customers/${customer.id}`}
                                        className={`card flex items-center gap-3 active:scale-[0.98] transition-transform !p-3 ${index === 2 && arr.length >= 3 ? 'opacity-60 [mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_50%,transparent_100%)]' : ''
                                            }`}
                                    >
                                        <div className="avatar avatar-sm bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                            {customer.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">
                                                {customer.name}
                                            </h3>
                                            <p className="text-[11px] text-gray-400 truncate">{customer.phone}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-[13px] font-bold ${customer.computed_debt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {formatCurrency(customer.computed_debt)}
                                            </div>
                                            <span className="text-[10px] text-gray-400">so'm</span>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                                    </Link>
                                ))}
                        </div>

                        <Link
                            to="/customers?filter=debtors"
                            className="flex items-center justify-center gap-2 py-3 mt-1 text-[14px] font-semibold text-blue-500 active:opacity-60 transition-opacity"
                        >
                            Barchasini ko'rish
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 flex flex-col items-center gap-2">
                        <Users size={32} strokeWidth={1.5} />
                        <p className="text-[14px]">Qarzdorlar yo'q</p>
                    </div>
                )
                }
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
