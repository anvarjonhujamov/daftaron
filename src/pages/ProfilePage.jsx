import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { profileApi } from '../api/profile.api'
import { authApi } from '../api/auth.api'
import { subscriptionApi } from '../api/subscription.api'
import { staffApi } from '../api/staff.api'
import {
    User, Phone, Mail, Lock, LogOut, ChevronRight,
    Edit3, Loader2, Check, X, Moon, Sun, Clock, CreditCard, Wallet, Package, MessageCircle, Store, Bell, ShieldCheck, TrendingUp, BarChart3
} from 'lucide-react'
import { Drawer } from 'vaul'
import LoadingSpinner from '../components/LoadingSpinner'
import { ProfileSkeleton } from '../components/Skeleton'
import { formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'
import { formatCurrency, parseCurrency } from '../utils/format'
import toast from 'react-hot-toast'
import PaymentMethods from '../components/PaymentMethods'
import PaymentDrawer from '../components/PaymentDrawer'
import LegalDrawer from '../components/LegalDrawer'
import { isUserStaff } from '../utils/roleHelper'

export default function ProfilePage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showPasswordDrawer, setShowPasswordDrawer] = useState(false)
    const [showEditDrawer, setShowEditDrawer] = useState(false)
    const [darkMode, setDarkMode] = useState(false)
    const [balance, setBalance] = useState(0)
    const [currentPlan, setCurrentPlan] = useState(null)
    const [usage, setUsage] = useState(null)
    const [isStaff, setIsStaff] = useState(false)

    const [profileForm, setProfileForm] = useState({
        name: '',
        phone: '',
        email: ''
    })
    const [profileErrors, setProfileErrors] = useState({})

    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        password: '',
        password_confirmation: ''
    })
    const [passwordErrors, setPasswordErrors] = useState({})

    const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false)
    const [selectedProvider, setSelectedProvider] = useState(null)
    const [showLegalDrawer, setShowLegalDrawer] = useState(false)

    const isTrialExpired = user?.trial_ends_at
        ? new Date(user.trial_ends_at) < new Date()
        : false

    useEffect(() => {
        loadProfile()
        // Check for saved dark mode preference
        const savedDarkMode = localStorage.getItem('darkMode') === 'true'
        setDarkMode(savedDarkMode)
        if (savedDarkMode) {
            document.documentElement.classList.add('dark')
        }
    }, [])

    const loadProfile = async () => {
        // 1) Profil ma'lumotlarini yuklash
        try {
            const data = await profileApi.getProfile()
            const userData = data.user || data.data || data

            let finalUser = userData
            if (!finalUser?.name && !finalUser?.phone) {
                try {
                    const stored = localStorage.getItem('user')
                    if (stored) {
                        finalUser = { ...JSON.parse(stored), ...userData }
                    }
                } catch (e) { /* ignore */ }
            }

            setUser(finalUser)
            setProfileForm({
                name: finalUser.name || '',
                phone: formatPhoneNumber(finalUser.phone || ''),
                email: finalUser.email || ''
            })
        } catch (err) {
            console.error('Failed to load profile:', err)
            // API xato bersa (masalan 403), localStorage dan olamiz
            try {
                const stored = localStorage.getItem('user')
                if (stored) {
                    const parsed = JSON.parse(stored)
                    setUser(parsed)
                    setProfileForm({
                        name: parsed.name || '',
                        phone: formatPhoneNumber(parsed.phone || ''),
                        email: parsed.email || ''
                    })
                }
            } catch (e) { /* ignore */ }
        }

        // 2) Balansni va tarif limitlarini yuklash
        try {
            const subData = await subscriptionApi.getStatus()
            setBalance(parseFloat(subData?.balance) || 0)

            // Find current plan from status plans
            if (subData?.current_plan_id && subData?.plans) {
                const plan = subData.plans.find(p => p.id === subData.current_plan_id)
                if (plan) {
                    setCurrentPlan(plan)
                }
            }
            // Set usage if available
            if (subData?.usage) {
                setUsage(subData.usage)
            }
        } catch (balanceErr) {
            console.error('Failed to load balance:', balanceErr)
        }

        // Check if user is staff
        try {
            const isStaffUser = await isUserStaff(staffApi)
            setIsStaff(isStaffUser)
        } catch (err) {
            console.error('Failed to check staff status:', err)
        }

        setLoading(false)
    }

    const toggleDarkMode = () => {
        const newValue = !darkMode
        setDarkMode(newValue)
        localStorage.setItem('darkMode', newValue.toString())
        if (newValue) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const handleUpdateProfile = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            const submitData = { ...profileForm, phone: getRawPhoneNumber(profileForm.phone) }
            const data = await profileApi.updateProfile(submitData)
            const updatedUser = data.user || data
            setUser(updatedUser)
            localStorage.setItem('user', JSON.stringify(updatedUser))
            setProfileErrors({})
            toast.success('Profil yangilandi')
            setShowEditDrawer(false)
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                setProfileErrors(err.response.data.errors)
            } else {
                toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
            }
        } finally {
            setSaving(false)
        }
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            await profileApi.updatePassword(passwordForm)
            toast.success('Parol yangilandi')
            setPasswordForm({
                current_password: '',
                password: '',
                password_confirmation: ''
            })
            setPasswordErrors({})
            setShowPasswordDrawer(false)
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                setPasswordErrors(err.response.data.errors)
            } else {
                toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
            }
        } finally {
            setSaving(false)
        }
    }

    const handleLogout = async () => {
        if (!confirm('Chiqmoqchimisiz?')) return

        try {
            await authApi.logout()
        } catch (err) {
            console.error('Logout error:', err)
        } finally {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            navigate('/login')
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const yyyy = date.getFullYear()
        return `${mm}/${dd}/${yyyy}`
    }

    if (loading) {
        return <ProfileSkeleton />
    }

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors overflow-x-hidden">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex items-center justify-center shrink-0">
                    <img src="/logo.png" alt="Daftaron" className="w-7 h-7 object-contain" />
                </div>
                <h1 className="text-[28px] font-bold text-gray-900 dark:text-white">Sozlamalar</h1>
            </div>

            {/* Profile Unified Card */}
            <div className="bg-white dark:bg-gray-800 rounded-[24px] p-4 mb-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-gray-100 dark:border-gray-700/50">

                {/* Header: User Info & Edit */}
                <div className="flex items-center justify-between mb-4 relative">
                    <div className="flex items-center gap-3">
                        <div className="w-[48px] h-[48px] rounded-full bg-emerald-500 text-white flex items-center justify-center text-[18px] font-bold shrink-0">
                            {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-[15.5px] font-semibold text-gray-900 dark:text-white leading-tight mb-[3px]">
                                {user?.name}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-[13px] leading-tight font-medium">
                                {user?.phone}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            if (user) {
                                setProfileForm({
                                    name: user.name || '',
                                    phone: formatPhoneNumber(user.phone || ''),
                                    email: user.email || ''
                                })
                            }
                            setShowEditDrawer(true)
                        }}
                        className="w-[34px] h-[34px] rounded-[12px] border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                    >
                        <Edit3 size={15} className="text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Shop / Tenant Info */}
                {(user?.tenant_name || user?.shop_name || user?.tenant?.name) && (
                    <div className="flex items-center gap-3.5 bg-[#f9fafb] dark:bg-gray-900/40 px-[14px] py-[10px] rounded-[18px] mb-[18px]">
                        <div className="w-[38px] h-[38px] rounded-[12px] bg-[#f5f3ff] dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                            <Store size={15} className="text-[#a855f7]" />
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                            <p className="text-[14px] font-medium text-gray-900 dark:text-white leading-none mb-[5px]">
                                {user?.tenant_name || user?.shop_name || user?.tenant?.name}
                            </p>
                            <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-none">
                                {user?.category_name || user?.tenant?.category?.name || "Do'kon"}
                            </p>
                        </div>
                    </div>
                )}

                {/* Balance Divider Line */}
                {!isStaff && <div className="h-px bg-gray-100 dark:bg-gray-700/50 -mx-4 mb-3"></div>}

                {/* Balance Section */}
                {!isStaff && (
                <div className="flex items-center gap-3.5 px-0.5 pb-0.5 relative">
                    <div className="w-[42px] h-[42px] rounded-full bg-[#eff6ff] dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <Wallet size={17} className="text-[#3b82f6]" />
                    </div>
                    <div className="flex flex-col justify-center pt-1">
                        <p className="text-[12px] text-gray-400 dark:text-gray-500 leading-none mb-1">Joriy balans</p>
                        <p className="text-[17px] font-bold text-gray-900 dark:text-white leading-none tracking-tight">
                            {formatCurrency(balance || 0)} <span className="text-[13px] font-normal text-gray-500 tracking-normal ml-0.5">so'm</span>
                        </p>
                    </div>
                </div>
                )}
            </div>

            {/* Subscription / Trial Period Card */}
            {!isStaff && user?.trial_ends_at && (
                <div
                    className={
                        isTrialExpired
                            ? 'card mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                            : 'card mb-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-800'
                    }
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Clock size={18} className={isTrialExpired ? 'text-red-500' : 'text-orange-500'} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[14px] font-medium text-gray-900 dark:text-white">Obuna muddati</p>
                            <p
                                className={
                                    'text-[13px] ' +
                                    (isTrialExpired
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-orange-600 dark:text-orange-400')
                                }
                            >
                                    {isTrialExpired
                                        ? "Muddati tugagan. Ta'rif tanlang."
                                        : `${formatDate(user.trial_ends_at)} gacha amal qiladi`}
                                </p>
                            </div>
                        </div>

                        {/* Plan Limits Section */}
                        {currentPlan && !isTrialExpired && (
                            <div className="mt-4 pt-4 border-t border-orange-200/50 dark:border-orange-800/50">
                                <p className="text-[12px] font-bold text-orange-800 dark:text-orange-300 mb-3 uppercase tracking-wider opacity-60">Qolgan limitlar</p>
                                <div className="grid grid-cols-1 gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/50 dark:bg-black/20 flex items-center justify-center shrink-0">
                                            <MessageCircle size={15} className="text-orange-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
                                                {usage ? (usage.sms_remaining !== undefined ? usage.sms_remaining : Math.max(0, usage.sms_limit - usage.sms_used)) : (currentPlan.sms_limit === 0 ? 'Cheksiz' : currentPlan.sms_limit || 'Cheksiz')} ta SMS
                                            </p>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">Oylik bepul xabarlar</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/50 dark:bg-black/20 flex items-center justify-center shrink-0">
                                            <Package size={15} className="text-orange-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">
                                                {usage ? (usage.debt_remaining !== undefined ? usage.debt_remaining : Math.max(0, usage.debt_limit - usage.debt_used)) : (currentPlan.debt_limit === 0 ? 'Cheksiz' : currentPlan.debt_limit || 'Cheksiz')} ta nasiya
                                            </p>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">Umumiy nasiyalar limiti</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                </div>
            )}

            {/* Menu Items */}
            <div className="card dark:bg-gray-800 mb-4 divide-y divide-gray-100 dark:divide-gray-700">
                {/* Dark Mode Toggle */}
                <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-yellow-100'
                            }`}>
                            {darkMode ? (
                                <Moon size={18} className="text-blue-500" />
                            ) : (
                                <Sun size={18} className="text-yellow-500" />
                            )}
                        </div>
                        <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                            Tungi rejim
                        </span>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className={`w-12 h-7 rounded-full p-1 transition-colors ${darkMode ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                    >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                    </button>
                </div>

                {/* Do'konlar */}
                {!isStaff && (
                <button
                    onClick={() => navigate('/shops', { state: { from: location.pathname } })}
                    className="w-full flex items-center justify-between py-4 border-b border-gray-50 dark:border-gray-700/50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Store size={18} className="text-emerald-500" />
                        </div>
                        <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                            Mening do'konlarim
                        </span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                </button>
                )}

                {/* Xodimlar */}
                {!isStaff && (
                <button
                    onClick={() => navigate('/staff', { state: { from: location.pathname } })}
                    className="w-full flex items-center justify-between py-4 border-b border-gray-50 dark:border-gray-700/50"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <User size={18} className="text-blue-500" />
                        </div>
                        <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                            Xodimlar
                        </span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                </button>
                )}

                {/* Subscription / Tariff */}
                {!isStaff && (
                <button
                    onClick={() => navigate('/subscription')}
                    className="w-full flex items-center justify-between py-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <Package size={18} className="text-indigo-500" />
                        </div>
                        <span className="text-[15px] font-medium text-gray-900 dark:text-white">
                            Ta'rif va obuna
                        </span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                </button>
                )}

                {/* Change Password */}
                <button
                    onClick={() => setShowPasswordDrawer(true)}
                    className="w-full flex items-center justify-between py-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                            <Lock size={18} className="text-orange-500" />
                        </div>
                        <span className="text-[15px] font-medium text-gray-900 dark:text-white">Parolni o'zgartirish</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                </button>

                {/* Aloqa / Support */}
                <button
                    type="button"
                    onClick={() => navigate('/support')}
                    className="w-full flex items-center justify-between py-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                            <MessageCircle size={18} className="text-sky-500" />
                        </div>
                        <span className="text-[15px] font-medium text-gray-900 dark:text-white">Aloqa / Qo'llab-quvvatlash</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                </button>

                {/* Maxfiylik siyosati */}
                <button
                    onClick={() => setShowLegalDrawer(true)}
                    className="w-full flex items-center justify-between py-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <ShieldCheck size={18} className="text-blue-500" />
                        </div>
                        <span className="text-[15px] font-medium text-gray-900 dark:text-white">Maxfiylik siyosati</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-400" />
                </button>

                {/* Balance top-up */}
                {!isStaff && (
                <div className="py-4">
                    <span className="text-[15px] font-medium text-gray-900 dark:text-white block mb-3">
                        Balansni to'ldirish
                    </span>
                    <PaymentMethods onSelect={(provider) => {
                        setSelectedProvider(provider)
                        setPaymentDrawerOpen(true)
                    }} />
                </div>
                )}
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="card dark:bg-gray-800 w-full flex items-center justify-center gap-2 text-red-500 font-semibold py-4"
            >
                <LogOut size={18} />
                Chiqish
            </button>

            {/* Edit Profile Drawer */}
            <Drawer.Root open={showEditDrawer} onOpenChange={setShowEditDrawer} shouldScaleBackground={false} repositionInputs={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh] overflow-y-auto">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                        Profilni tahrirlash
                                    </Drawer.Title>
                                    <Drawer.Description className="text-gray-400 text-[14px]">
                                        Profil ma'lumotlarini yangilash
                                    </Drawer.Description>
                                </div>
                                <button
                                    onClick={() => setShowEditDrawer(false)}
                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                                >
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="label dark:text-gray-400">Ism</label>
                                    <div className="relative">
                                        <User size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${profileErrors.name ? 'text-red-400' : 'text-gray-400'}`} />
                                        <input
                                            type="text"
                                            className={`input dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-11 ${profileErrors.name ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                            value={profileForm.name}
                                            onChange={(e) => {
                                                setProfileForm({ ...profileForm, name: e.target.value })
                                                if (profileErrors.name) setProfileErrors({ ...profileErrors, name: null })
                                            }}
                                            required
                                        />
                                    </div>
                                    {profileErrors.name && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{profileErrors.name[0]}</p>}
                                </div>

                                <div>
                                    <label className="label dark:text-gray-400">Telefon</label>
                                    <div className="relative">
                                        <Phone size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${profileErrors.phone ? 'text-red-400' : 'text-gray-400'}`} />
                                        <input
                                            type="tel"
                                            inputMode="tel"
                                            autoComplete="tel"
                                            className={`input dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-11 ${profileErrors.phone ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                            placeholder="+998 XX XXX XX XX"
                                            value={profileForm.phone}
                                            onChange={(e) => {
                                                const formatted = formatPhoneNumber(e.target.value)
                                                setProfileForm({ ...profileForm, phone: formatted })
                                                if (profileErrors.phone) setProfileErrors({ ...profileErrors, phone: null })
                                            }}
                                            required
                                        />
                                    </div>
                                    {profileErrors.phone && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{profileErrors.phone[0]}</p>}
                                </div>

                                <div>
                                    <label className="label dark:text-gray-400">Email</label>
                                    <div className="relative">
                                        <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${profileErrors.email ? 'text-red-400' : 'text-gray-400'}`} />
                                        <input
                                            type="email"
                                            className={`input dark:bg-gray-700 dark:border-gray-600 dark:text-white pl-11 ${profileErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                            value={profileForm.email}
                                            onChange={(e) => {
                                                setProfileForm({ ...profileForm, email: e.target.value })
                                                if (profileErrors.email) setProfileErrors({ ...profileErrors, email: null })
                                            }}
                                        />
                                    </div>
                                    {profileErrors.email && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{profileErrors.email[0]}</p>}
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-orange w-full"
                                    disabled={saving}
                                >
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : 'Saqlash'}
                                </button>
                            </form>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Change Password Drawer */}
            <Drawer.Root open={showPasswordDrawer} onOpenChange={setShowPasswordDrawer} shouldScaleBackground={false} repositionInputs={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                        Parolni o'zgartirish
                                    </Drawer.Title>
                                    <Drawer.Description className="text-gray-400 text-[14px]">
                                        Xavfsizlik maqsadida yangi parol kamida 6 belgidan iborat bo'lishi kerak
                                    </Drawer.Description>
                                </div>
                                <button
                                    onClick={() => setShowPasswordDrawer(false)}
                                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                                >
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div>
                                    <label className="label dark:text-gray-400">Joriy parol</label>
                                    <input
                                        type="password"
                                        className={`input ${passwordErrors.current_password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                        value={passwordForm.current_password}
                                        onChange={(e) => {
                                            setPasswordForm({ ...passwordForm, current_password: e.target.value })
                                            if (passwordErrors.current_password) setPasswordErrors({ ...passwordErrors, current_password: null })
                                        }}
                                        required
                                    />
                                    {passwordErrors.current_password && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{passwordErrors.current_password[0]}</p>}
                                </div>
                                <div>
                                    <label className="label dark:text-gray-400">Yangi parol</label>
                                    <input
                                        type="password"
                                        className={`input ${passwordErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                        value={passwordForm.password}
                                        onChange={(e) => {
                                            setPasswordForm({ ...passwordForm, password: e.target.value })
                                            if (passwordErrors.password) setPasswordErrors({ ...passwordErrors, password: null })
                                        }}
                                        required
                                    />
                                    {passwordErrors.password && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{passwordErrors.password[0]}</p>}
                                </div>
                                <div>
                                    <label className="label dark:text-gray-400">Yangi parolni takrorlash</label>
                                    <input
                                        type="password"
                                        className="input"
                                        value={passwordForm.password_confirmation}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn btn-primary w-full mt-2"
                                >
                                    {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                                </button>
                            </form>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            <PaymentDrawer
                isOpen={paymentDrawerOpen}
                onClose={() => setPaymentDrawerOpen(false)}
                user={user}
                provider={selectedProvider}
            />

            <LegalDrawer 
                isOpen={showLegalDrawer}
                onClose={() => setShowLegalDrawer(false)}
            />

        </div>
    )
}
