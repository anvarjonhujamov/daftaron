import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { dashboardApi } from '../api/dashboard.api'
import { customersApi } from '../api/customers.api'
import { profileApi } from '../api/profile.api'
import { staffApi } from '../api/staff.api'
import {
    TrendingUp, Users, ChevronRight,
    UserPlus, Activity, CheckCircle2, Bell, ArrowDown, ArrowUp, Search, ArrowLeft, X, Phone, UserCog,
    Wallet
} from 'lucide-react'
import { DashboardSkeleton } from '../components/Skeleton'
import { formatCurrency } from '../utils/format'
import { isUserStaff, isStaffFromUser } from '../utils/roleHelper'

const num = (v) => Number(v) || 0

const readStoredUser = () => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
}

export default function DashboardPage() {
    const location = useLocation()
    // Bosh sahifa faqat GET /dashboard dan chiziladi (xodim filtri serverda)
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(readStoredUser)
    const [isStaff, setIsStaff] = useState(() => isStaffFromUser(readStoredUser()) === true)
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearchActive, setIsSearchActive] = useState(false)
    const [searchResults, setSearchResults] = useState([])
    const searchSeq = useRef(0)

    useEffect(() => {
        loadStats()
        resolveUser()
    }, [])

    const loadStats = async () => {
        try {
            setStats(await dashboardApi.getStats())
        } catch (err) {
            console.error('Failed to load dashboard data:', err)
        } finally {
            setLoading(false)
        }
    }

    // Foydalanuvchi va rol localStorage'dan (PrivateRoute /auth/me bilan yangilaydi); yo'q bo'lsagina so'raladi
    const resolveUser = async () => {
        try {
            let current = readStoredUser()
            if (!current) {
                const profileData = await profileApi.getProfile()
                current = profileData.user || profileData.data || profileData
                localStorage.setItem('user', JSON.stringify(current))
                setUser(current)
            }
            const fromRoles = isStaffFromUser(current)
            setIsStaff(fromRoles !== null ? fromRoles : await isUserStaff(staffApi))
        } catch (e) {
            console.error('Failed to load user info:', e)
        }
    }

    // Qidiruv: yozilganda serverdan (debounce), oldindan hamma mijozni yuklamaymiz
    useEffect(() => {
        const q = searchQuery.trim()
        if (!q) {
            setSearchResults([])
            return
        }
        const seq = ++searchSeq.current
        const timer = setTimeout(async () => {
            try {
                const data = await customersApi.getCustomers({ q })
                if (seq !== searchSeq.current) return
                const list = Array.isArray(data) ? data : (data.data || [])
                setSearchResults(list.slice(0, 5))
            } catch {
                if (seq === searchSeq.current) setSearchResults([])
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const debtsCount = num(stats?.debts_count)
    const totalGiven = num(stats?.total_debts)
    const totalDebt = num(stats?.remaining_debt)
    const totalPaid = num(stats?.total_paid)
    const todayDebts = num(stats?.today_debts)
    const todayPayments = num(stats?.today_payments)
    const todaySupplierPayments = num(stats?.today_supplier_payments)
    const unreadNotifs = num(stats?.unread_notifications)
    const topDebtors = (stats?.top_debtors || []).map((c) => ({ ...c, computed_debt: num(c.remaining_amount) }))

    if (loading) {
        return <DashboardSkeleton />
    }

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors relative overflow-x-hidden">
            {/* Header */}
            <div className="relative flex items-center justify-between mb-6 h-10 min-h-[40px]">
                {isSearchActive ? (
                    <div className="absolute inset-0 z-20 flex items-center gap-2 bg-gray-50 dark:bg-gray-900 w-full animate-in fade-in slide-in-from-right-4 duration-200">
                        <button onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} className="p-2 -ml-2 text-gray-500 rounded-full active:bg-gray-200 dark:active:bg-gray-800 transition-colors">
                            <ArrowLeft size={22} />
                        </button>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                autoFocus
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Ism yoki raqam..."
                                className="w-full h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-4 pr-10 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-[15px] text-gray-900 dark:text-white transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        
                        {/* Search Dropdown */}
                        {searchQuery && (
                            <div className="fixed top-[88px] left-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-30 animate-in fade-in slide-in-from-top-2">
                                {searchResults.length > 0 ? (
                                    <div className="max-h-[300px] overflow-y-auto w-full">
                                        {searchResults.map(user => (
                                            <Link
                                                key={user.id}
                                                to={`/customers/${user.id}`}
                                                className="flex items-center gap-3 p-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors last:border-0 w-full active:bg-gray-100 dark:active:bg-gray-700"
                                            >
                                                <div className="w-10 h-10 min-w-[40px] rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-[16px]">
                                                    {user.name?.charAt(0)?.toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <h4 className="text-[14px] font-semibold text-gray-900 dark:text-white truncate w-full">{user.name}</h4>
                                                    <p className="text-[12px] text-gray-500 flex items-center gap-1 mt-0.5 truncate w-full">
                                                        <Phone size={10} className="shrink-0" />
                                                        {user.phone}
                                                    </p>
                                                </div>
                                                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-5 text-center text-gray-500 text-[14px]">
                                        "<b>{searchQuery}</b>" bo'yicha mijoz topilmadi
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {isStaff ? (
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                                    <img src="/logo.png" alt="Daftaron" className="w-7 h-7 object-contain" />
                                </div>
                                <h1 className="text-[20px] xs:text-[24px] font-bold text-gray-900 dark:text-white truncate">
                                    {user?.tenant_name || user?.shop_name || user?.tenant?.name || 'Daftaron'}
                                </h1>
                            </div>
                        ) : (
                            <Link to="/shops" state={{ from: location.pathname }} className="flex items-center gap-3 overflow-hidden active:opacity-70 transition-opacity flex-1 min-w-0 mr-2" title="Do'konni o'zgartirish">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                                    <img src="/logo.png" alt="Daftaron" className="w-7 h-7 object-contain" />
                                </div>
                                <h1 className="text-[20px] xs:text-[24px] font-bold text-gray-900 dark:text-white truncate flex items-center gap-1">
                                    <span className="truncate">{user?.tenant_name || user?.shop_name || user?.tenant?.name || 'Daftaron'}</span>
                                    <ChevronRight size={18} className="text-gray-400 mt-1 shrink-0" />
                                </h1>
                            </Link>
                        )}

                        <div className="flex gap-1.5 shrink-0">
                            <button
                                onClick={() => setIsSearchActive(true)}
                                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-sm text-gray-500 active:scale-95 transition-all"
                                title="Qidirish"
                            >
                                <Search size={22} />
                            </button>
                            <Link
                                to="/notifications"
                                className="relative w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-sm text-gray-500 active:scale-95 transition-all"
                                title="Bildirishnomalar"
                            >
                                <Bell size={22} />
                                {unreadNotifs > 0 && (
                                    <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white shadow-sm ring-1 ring-white dark:ring-gray-800">
                                        {unreadNotifs > 99 ? '99+' : unreadNotifs}
                                    </span>
                                )}
                            </Link>
                            {!isStaff && (
                                <Link
                                    to="/staff"
                                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-sm text-gray-500 active:scale-95 transition-all"
                                    title="Xodimlar"
                                >
                                    <UserCog size={22} />
                                </Link>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Main Stats Grid — ASLI 3c74c86 committagi original gradient rang sxemasi */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                {/* 1. JAMI NASIYA SONI */}
                <div className="relative overflow-hidden rounded-[20px] p-4 h-[100px] bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all">
                    <div className="relative z-10 flex flex-col justify-between h-full text-white">
                        <div className="flex items-center justify-between">
                            <span className="text-[12px] font-medium opacity-90">Jami nasiya soni</span>
                            <div className="p-1.5 bg-white/20 rounded-lg">
                                <Users size={16} className="text-white" />
                            </div>
                        </div>
                        <p className="text-[24px] font-bold leading-none">{debtsCount}</p>
                    </div>
                </div>

                {/* 2. UMUMIY NASIYA */}
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

                {/* 3. QOLGAN QARZ */}
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

                {/* 4. TO'LANGAN SUMMA (asl original: emerald → teal) */}
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

            {/* Today Stats — 3 ta: Bugun nasiya / Bugun to'lov / Bugun ta'minotchiga berilgan */}
            <div className="flex flex-col gap-3 mb-6 md:flex-row">
                <div className="flex-1 card dark:bg-gray-800 flex items-center gap-3 !p-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-red-900/40 dark:bg-red-900/50 flex items-center justify-center shrink-0">
                        <ArrowDown size={18} className="text-red-400 dark:text-red-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[12px] text-gray-400">Bugun nasiya</p>
                        <p className="text-[16px] font-bold text-red-400 dark:text-red-300 truncate">{formatCurrency(todayDebts)}</p>
                    </div>
                </div>
                <div className="flex-1 card dark:bg-gray-800 flex items-center gap-3 !p-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-green-900/40 dark:bg-green-900/50 flex items-center justify-center shrink-0">
                        <ArrowUp size={18} className="text-green-400 dark:text-green-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[12px] text-gray-400">Bugun to'lov</p>
                        <p className="text-[16px] font-bold text-green-400 dark:text-green-300 truncate">{formatCurrency(todayPayments)}</p>
                    </div>
                </div>
                <div className="flex-1 card dark:bg-gray-800 flex items-center gap-3 !p-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-amber-900/30 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                        <Wallet size={18} className="text-amber-400 dark:text-amber-300" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[12px] text-gray-400">Bugun ta'minotchiga berilgan</p>
                        <p className="text-[16px] font-bold text-amber-400 dark:text-amber-300 truncate">{formatCurrency(todaySupplierPayments)}</p>
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
                                            <p className="text-[12px] text-gray-400 truncate">{customer.phone}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-[13px] font-bold ${customer.computed_debt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {formatCurrency(customer.computed_debt)}
                                            </div>
                                            <span className="text-[11px] text-gray-400">so'm</span>
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
