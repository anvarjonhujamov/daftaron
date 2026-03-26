import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { subscriptionApi } from '../api/subscription.api'
import { useSubscription } from '../contexts/SubscriptionContext'
import { formatCurrency, parseCurrency } from '../utils/format'
import { buildClickUrl } from '../utils/click'
import toast from 'react-hot-toast'
import PaymentMethods from '../components/PaymentMethods'
import PaymentDrawer from '../components/PaymentDrawer'
import { SubscriptionSkeleton } from '../components/Skeleton'
import {
    CheckCircle2, AlertTriangle, ArrowLeft, ArrowRight,
    Package, Clock, Receipt, Check, ChevronDown, ChevronUp, Zap, Tag, Loader2
} from 'lucide-react'

export default function SubscriptionPage() {
    const navigate = useNavigate()
    const { updateSubscriptionData } = useSubscription()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState(null)
    const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false)
    const [selectedProvider, setSelectedProvider] = useState(null)
    const [openPlanId, setOpenPlanId] = useState(null)
    const [promoCode, setPromoCode] = useState('')
    const [promoResult, setPromoResult] = useState(null)
    const [promoChecking, setPromoChecking] = useState(false)

    useEffect(() => {
        loadStatus()
    }, [])

    const loadStatus = async () => {
        setLoading(true)
        try {
            const data = await subscriptionApi.getStatus()
            setStatus(data)
            updateSubscriptionData(data)
        } catch (err) {
            console.error('Failed to load subscription status:', err)
            toast.error(err.response?.data?.message || 'Obuna holatini yuklashda xatolik yuz berdi')
        } finally {
            setLoading(false)
        }
    }

    const handleCheckPromo = async () => {
        if (!promoCode.trim() || promoChecking) return
        setPromoChecking(true)
        setPromoResult(null)
        try {
            const data = await subscriptionApi.checkPromoCode(promoCode.trim())
            setPromoResult(data)
            if (data.valid) {
                toast.success(data.message || `Chegirma: ${data.discount_label}`)
            } else {
                toast.error(data.message || 'Promocode yaroqsiz')
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Promocode tekshirishda xatolik')
            setPromoResult(null)
        } finally {
            setPromoChecking(false)
        }
    }

    const handleChoosePlan = async (planId) => {
        if (!planId || saving) return
        setSaving(true)

        try {
            const code = promoResult?.valid ? promoCode.trim() : null
            const data = await subscriptionApi.choosePlan(planId, code)
            toast.success(data.message || "Ta'rif muvaffaqiyatli tanlandi")

            // Status ni qayta yuklash
            await loadStatus()

            // Promo ni tozalash
            setPromoCode('')
            setPromoResult(null)

            // 2 sekunddan keyin bosh sahifaga yo'naltirish
            setTimeout(() => {
                navigate('/', { replace: true })
            }, 2000)
        } catch (err) {
            const resp = err.response?.data
            if (resp?.message) {
                toast.error(resp.message)
            } else {
                toast.error("Ta'rifni tanlashda xatolik yuz berdi")
            }
        } finally {
            setSaving(false)
        }
    }

    const trialInfo = status?.trial_info || status?.trial || {}
    const apiPlans = status?.plans || []
    const transactions = status?.transactions || []
    const apiPackages = status?.extra_packages || []

    // API dan kelgan tariflar (odatda 1 ta) va UI uchun qolgan 2 ta mock tarif
    // Backend to'liq ishlaguncha 3 ta tarif ko'rsatish uchun
    const mockPlans = [
        {
            id: 'mock_pro',
            name: "Pro ta'rif",
            price: 59000,
            description: "Biznesini jiddiy yuritayotganlar uchun",
            features: [
                "Cheksiz nasiya qo'shish",
                "3 ta biznes",
                "Batafsil moliyaviy hisobotlar",
                "50 ta bepul SMS",
                "Limitdan tashqari sms 170 so'm",
                "3 ta xodim qo'shish",
                "Tezkor qo'llab-quvvatlash"
            ],
            is_popular: true,
            is_coming_soon: true
        },
        {
            id: 'mock_premium',
            name: "Premium ta'rif",
            price: 99000,
            description: "Katta hajmdagi bizneslar uchun",
            features: [
                "Cheksiz nasiya",
                "10 ta biznes",
                "100 ta bepul SMS",
                "10 ta xodim qo'shish",
                "Advanced analytics (chuqur hisobotlar)",
                "AI orqali ovoz bilan ma'lumot kiritish",
                "Avtomatik SMS yuborish (schedule)"
            ],
            is_coming_soon: true
        }
    ]

    const extraPackages = apiPackages.length > 0 
        ? apiPackages.map(pkg => ({
            id: pkg.id,
            name: pkg.type === 'debt' ? `${pkg.quantity} ta nasiya limiti` : `${pkg.quantity} ta SMS limiti`,
            price: pkg.price,
            limits: pkg.quantity,
            type: pkg.type
        }))
        : [
            { id: 'extra_10', name: '10 ta nasiya limiti', price: 9000, limits: 10, type: 'debt' },
            { id: 'extra_50', name: '50 ta nasiya limiti', price: 39000, limits: 50, type: 'debt' },
            { id: 'extra_100', name: '100 ta nasiya limiti', price: 69000, limits: 100, type: 'debt' },
        ]

    const plans = apiPlans.length > 0
        ? [...apiPlans, ...mockPlans.slice(0, Math.max(0, 3 - apiPlans.length))]
        : mockPlans
    const numericBalance = parseCurrency(status?.balance ?? 0)

    // Joriy aktiv ta'rif ID sini aniqlash
    const activePlanId = trialInfo?.plan_id ?? status?.current_plan_id ?? status?.active_plan_id ?? null
    const isSubscriptionActive = !trialInfo.is_expired && trialInfo.status !== 0

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const dd = String(date.getDate()).padStart(2, '0')
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const yyyy = date.getFullYear()
        return `${dd}.${mm}.${yyyy}`
    }

    if (loading) {
        return <SubscriptionSkeleton />
    }

    const isBlocked = trialInfo?.is_expired || trialInfo?.status === 0

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
            <div className="flex items-center justify-between mb-6">
                {isBlocked ? (
                    <div className="w-10 h-10" />
                ) : (
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                    >
                        <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                )}
                <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">
                    Ta'rif va obuna
                </h1>
                <div className="w-10 h-10" />
            </div>

            {/* Trial / subscription status card */}
            <div
                className={
                    trialInfo.is_expired || trialInfo.status === 0
                        ? 'card mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : 'card mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                }
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${trialInfo.is_expired || trialInfo.status === 0
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-green-100 dark:bg-green-900/30'
                        }`}>
                        <Clock size={18} className={
                            trialInfo.is_expired || trialInfo.status === 0
                                ? 'text-red-500'
                                : 'text-green-500'
                        } />
                    </div>
                    <div className="flex-1">
                        <p className="text-[15px] font-medium text-gray-900 dark:text-white">
                            Obuna holati
                        </p>
                        {trialInfo.is_expired ? (
                            <p className="text-[14px] text-red-500 font-medium">
                                Bepul muddat tugagan. Ta'rif tanlang.
                            </p>
                        ) : (
                            <>
                                {trialInfo.trial_ends_at && (
                                    <p className="text-[13px] text-gray-500 dark:text-gray-400">
                                        {formatDate(trialInfo.trial_ends_at)} gacha amal qiladi
                                    </p>
                                )}
                                {typeof trialInfo.days_remaining === 'number' && (() => {
                                    const days = Math.max(0, Math.round(trialInfo.days_remaining))
                                    return (
                                        <p className="text-[13px] text-green-500 font-medium">
                                            Qolgan kunlar: {days} kun
                                        </p>
                                    )
                                })()}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Balance */}
            <div className="card dark:bg-gray-800 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Receipt size={18} className="text-emerald-500" />
                    </div>
                    <div className="flex-1">
                        <p className="text-[14px] font-medium text-gray-900 dark:text-white">Balans</p>
                        <p className="text-[18px] font-bold text-gray-900 dark:text-white">
                            {formatCurrency(status?.balance ?? 0)} <span className="text-[13px] text-gray-400">so'm</span>
                        </p>
                    </div>
                </div>
                <p className="mt-2 text-[13px] text-gray-400">
                    Balansni to'ldirish uchun to'lov usulini tanlang.
                </p>
                <div className="mt-4">
                    <PaymentMethods onSelect={(provider) => {
                        setSelectedProvider(provider)
                        setPaymentDrawerOpen(true)
                    }} />
                </div>
            </div>

            <PaymentDrawer
                isOpen={paymentDrawerOpen}
                onClose={() => setPaymentDrawerOpen(false)}
                user={(() => {
                    const stored = localStorage.getItem('user')
                    return stored ? JSON.parse(stored) : null
                })()}
                provider={selectedProvider}
            />

            {/* Plans */}
            <div className="mb-4">
                <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white mb-3">
                    Ta'riflar
                </h2>
                {plans.length === 0 ? (
                    <p className="text-[14px] text-gray-400">
                        Hozircha ta'riflar ro'yxati yo'q.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {plans.map((plan) => {
                            const planPriceAmount = parseCurrency(plan.price ?? 0)
                            const hasEnoughBalance = numericBalance >= planPriceAmount
                            const isActivePlan = activePlanId && activePlanId === plan.id && isSubscriptionActive
                            const isOpen = openPlanId === plan.id

                             return (
                                <div
                                    key={plan.id}
                                    className={`card dark:bg-gray-800 transition-all relative ${isActivePlan
                                        ? 'border-2 border-green-400 dark:border-green-600'
                                        : plan.is_popular
                                            ? 'border-2 border-blue-500 dark:border-blue-700 shadow-md shadow-blue-500/10'
                                            : 'border border-gray-100 dark:border-gray-700'
                                        }`}
                                >
                                    {plan.is_popular && (
                                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                                            <span className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                                                Eng ommabob
                                            </span>
                                        </div>
                                    )}
                                    {/* Accordion header — always visible */}
                                    <button
                                        type="button"
                                        onClick={() => setOpenPlanId(isOpen ? null : plan.id)}
                                        className="w-full flex items-center gap-3 text-left"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isActivePlan
                                            ? 'bg-green-100 dark:bg-green-900/30'
                                            : 'bg-indigo-100 dark:bg-indigo-900/30'
                                            }`}>
                                            <Package size={18} className={
                                                isActivePlan ? 'text-green-500' : 'text-indigo-500'
                                            } />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
                                                    {plan.name}
                                                </p>
                                                {isActivePlan && (
                                                    <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                        Faol
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[14px] font-bold text-blue-600 dark:text-blue-400">
                                                {formatCurrency(plan.price || 0)} <span className="text-[12px] font-normal text-gray-400">so'm/oy</span>
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-gray-400">
                                            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </div>
                                    </button>

                                    {/* Accordion content — expanded */}
                                    {isOpen && (
                                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                            <div className="space-y-1">
                                                {(() => {
                                                    // Get features from plan.features OR extract from plan.description
                                                    let featuresArray = []
                                                    
                                                    if (plan.features && Array.isArray(plan.features) && plan.features.length > 0) {
                                                        featuresArray = plan.features
                                                    } else if (plan.description) {
                                                        // Replace HTML line breaks with newlines, then split
                                                        const cleanDesc = plan.description
                                                            .replace(/<\/p>|<\/div>|<br\s*\/?>|<li>/gi, '\n')
                                                            .replace(/<[^>]*>/g, '') // Remove remaining tags
                                                        
                                                        featuresArray = cleanDesc.split(/\r?\n/)
                                                            .map(line => line.trim())
                                                            .filter(line => line.length > 0 && !line.includes('so\'m /oy') && !line.toLowerCase().includes('oddiy reja'))
                                                    }

                                                    if (featuresArray.length === 0) return null

                                                    return featuresArray.map((feature, i) => (
                                                        <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50/50 dark:border-gray-700/50 last:border-0">
                                                            <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                                                <Check size={12} className="text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                            <span className="text-[14px] font-medium text-gray-700 dark:text-gray-200">{feature}</span>
                                                        </div>
                                                    ))
                                                })()}
                                            </div>

                                            {!hasEnoughBalance && (trialInfo.is_expired || trialInfo.status === 0) && !isActivePlan && (
                                                <p className="mt-2 text-[12px] text-red-500">
                                                    Balans yetarli emas. Avval balansni to'ldiring.
                                                </p>
                                            )}

                                            {isActivePlan ? (
                                                <div className="mt-3 btn w-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-semibold cursor-default flex items-center justify-center gap-2">
                                                    <Check size={16} />
                                                    Joriy ta'rif
                                                </div>
                                            ) : plan.is_coming_soon ? (
                                                <div className="mt-4 py-2 text-center text-[14px] text-gray-500 dark:text-gray-400 font-semibold bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                                                    Tez kunda
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Promocode */}
                                                    <div className="mt-3 flex gap-2">
                                                        <div className="relative flex-1">
                                                            <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Promocode"
                                                                value={promoCode}
                                                                onChange={(e) => {
                                                                    setPromoCode(e.target.value.toUpperCase())
                                                                    setPromoResult(null)
                                                                }}
                                                                className="w-full pl-9 pr-3 py-2.5 text-[13px] rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            disabled={!promoCode.trim() || promoChecking}
                                                            onClick={handleCheckPromo}
                                                            className="px-4 py-2.5 text-[12px] font-semibold rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                                                        >
                                                            {promoChecking ? <Loader2 size={14} className="animate-spin" /> : 'Tekshirish'}
                                                        </button>
                                                    </div>
                                                    {promoResult && (
                                                        <p className={`mt-1.5 text-[12px] font-medium ${promoResult.valid ? 'text-green-500' : 'text-red-500'}`}>
                                                            {promoResult.valid ? `Chegirma: ${promoResult.discount_label}` : promoResult.message}
                                                        </p>
                                                    )}

                                                    {/* Narx */}
                                                    <div className="mt-3 py-3 px-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
                                                        <span className="text-[13px] text-gray-500 dark:text-gray-400">Narxi:</span>
                                                        <div className="flex items-center gap-2">
                                                            {promoResult?.valid && (() => {
                                                                const original = planPriceAmount
                                                                const discount = promoResult.type === 'percent'
                                                                    ? Math.round(original * promoResult.amount / 100)
                                                                    : promoResult.amount
                                                                const final = Math.max(0, original - discount)
                                                                return (
                                                                    <>
                                                                        <span className="text-[14px] text-gray-400 line-through">
                                                                            {formatCurrency(original)}
                                                                        </span>
                                                                        <span className="text-[16px] font-bold text-green-500">
                                                                            {formatCurrency(final)} <span className="text-[12px] font-normal">so'm</span>
                                                                        </span>
                                                                    </>
                                                                )
                                                            })()}
                                                            {!promoResult?.valid && (
                                                                <span className="text-[16px] font-bold text-gray-900 dark:text-white">
                                                                    {formatCurrency(plan.price || 0)} <span className="text-[12px] font-normal text-gray-400">so'm</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        disabled={saving}
                                                        onClick={() => handleChoosePlan(plan.id)}
                                                        className="mt-3 btn btn-primary w-full"
                                                    >
                                                        {saving ? 'Tanlanmoqda...' : "Ushbu ta'rifni tanlash"}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Extra Packages */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 mt-8">
                    <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">
                        Bir martalik to'plamlar
                    </h2>
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Paketlar
                    </span>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                    {extraPackages.map((pkg) => (
                        <div 
                            key={pkg.id}
                            className="card dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-between p-4 active:scale-[0.98] transition-all hover:border-blue-200 dark:hover:border-blue-900/50"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                    <Zap size={18} className="text-blue-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
                                        {pkg.name}
                                    </p>
                                    <p className="text-[12px] text-gray-400">
                                        Bir martalik xarid
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1.5 ml-3">
                                <p className="text-[16px] font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                    {formatCurrency(pkg.price)} <span className="text-[11px] font-normal text-gray-400">so'm</span>
                                </p>
                                <button 
                                    onClick={async () => {
                                        if (numericBalance < pkg.price) {
                                            toast.error('Balans yetarli emas')
                                            return
                                        }
                                        
                                        if (saving) return
                                        
                                        try {
                                            setSaving(true)
                                            if (pkg.id.toString().startsWith('extra_')) {
                                                toast.success('Tez kunda: Paket sotib olish funksiyasi ishga tushadi')
                                                return
                                            }
                                            
                                            const data = await subscriptionApi.buyExtraPackage(pkg.id)
                                            toast.success(data.message || 'Paket muvaffaqiyatli sotib olindi')
                                            await loadStatus()
                                        } catch (err) {
                                            console.error('Failed to buy package:', err)
                                            toast.error(err.response?.data?.message || 'Sotib olishda xatolik yuz berdi')
                                        } finally {
                                            setSaving(false)
                                        }
                                    }}
                                    disabled={saving}
                                    className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {saving ? '...' : 'Sotib olish'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-2xl flex items-start gap-3">
                    <Clock size={16} className="text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                        Ushbu to'plamlar obunangiz holatidan qat'iy nazar jami limitingizga qo'shiladi va muddatsiz saqlanadi. Obuna tugasa ham bu limitlar saqlanib qoladi.
                    </p>
                </div>
            </div>

            {/* Transactions (short history) */}
            {transactions.length > 0 && (
                <div className="mb-4">
                    <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white mb-3">
                        So'nggi tranzaksiyalar
                    </h2>
                    <div className="space-y-2">
                        {transactions.map((tx) => (
                            <div key={tx.id || `${tx.date}-${tx.amount}`} className="card dark:bg-gray-800 flex items-center justify-between">
                                <div>
                                    <p className="text-[14px] font-medium text-gray-900 dark:text-white">
                                        {tx.description || 'Tranzaksiya'}
                                    </p>
                                    <p className="text-[12px] text-gray-500 dark:text-gray-400">
                                        {formatDate(tx.created_at || tx.date)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[15px] font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(tx.amount || 0)}{' '}
                                        <span className="text-[12px] text-gray-400">so'm</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
