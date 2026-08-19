import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Drawer } from 'vaul'
import { customersApi } from '../api/customers.api'
import { debtsApi } from '../api/debts.api'
import { paymentsApi } from '../api/payments.api'
import { staffApi } from '../api/staff.api'
import { subscriptionApi } from '../api/subscription.api'
import toast from 'react-hot-toast'
import {
    ChevronLeft, MoreVertical, Phone as PhoneIcon, MessageSquare,
    Plus, CreditCard, Loader2, FileText, X, Trash2, Edit2,
    Wallet, CheckCircle2, Tag
} from 'lucide-react'
import { formatCurrency, parseCurrency } from '../utils/format'
import { useSubscription } from '../contexts/SubscriptionContext'
import { CustomerDetailSkeleton } from '../components/Skeleton'
import { AlertCircle, Zap, RefreshCw } from 'lucide-react'

const pickAnyNum = (obj, keyGroups, fallback = null) => {
    if (!obj || typeof obj !== 'object') return fallback
    for (const keys of keyGroups) {
        for (const k of keys) {
            if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
                const n = Number(obj[k])
                if (!isNaN(n)) return n
            }
        }
    }
    return fallback
}

export default function CustomerDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [customer, setCustomer] = useState(null)
    const [debts, setDebts] = useState([])
    const [customerPayments, setCustomerPayments] = useState([])
    const [historyTab, setHistoryTab] = useState('debts') // 'debts' | 'payments'
    const [staffMembers, setStaffMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const { status: subStatus, remaining, sms_remaining, total } = useSubscription()
    const [showDebtDrawer, setShowDebtDrawer] = useState(false)
    const [showGenericPaymentDrawer, setShowGenericPaymentDrawer] = useState(false) // yashil "To'lov"
    const [showDebtPaymentDrawer, setShowDebtPaymentDrawer] = useState(false) // kartadagi "To'lov qilish"
    const [showOptionsDrawer, setShowOptionsDrawer] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [debtForm, setDebtForm] = useState({
        amount: '',
        description: '',
        debt_date: '',
        send_sms: false
    })
    const [debtErrors, setDebtErrors] = useState({})
    // Umumiy to'lov (tegirmaki yashil tugma)
    const [genericPaymentForm, setGenericPaymentForm] = useState({ amount: '', description: '', paid_at: '', send_sms: false })
    const [genericPaymentErrors, setGenericPaymentErrors] = useState({})
    const [genericPaymentMode, setGenericPaymentMode] = useState('debt') // 'debt' | 'balance'
    // Faqat bitta nasiya uchun to'lov (kartadagi ko'k tugma)
    const [debtPaymentForm, setDebtPaymentForm] = useState({ debt_id: null, amount: '', paid_at: '', send_sms: false })
    const [debtPaymentErrors, setDebtPaymentErrors] = useState({})
    const [showBlockedDrawer, setShowBlockedDrawer] = useState(false)
    const [blockedType, setBlockedType] = useState(null) // 'limit' | 'expired'
    const [limitMeta, setLimitMeta] = useState({
        loaded: false,
        isUnlimited: false,
        remaining: null
    })

    useEffect(() => {
        loadData()
        loadStaff()
    }, [id])

    useEffect(() => {
        const loadSubscriptionLimit = async () => {
            try {
                const data = await subscriptionApi.getStatus()
                const trial = data?.trial_info || data?.trial || {}
                const usage = data?.usage || {}

                const debtLimit =
                    usage.debt_limit ??
                    data?.total_limit ??
                    data?.total ??
                    trial?.total_limit ??
                    null

                const remainingLimit =
                    usage.debt_remaining ??
                    data?.remaining_limit ??
                    data?.remaining ??
                    trial?.remaining_limit ??
                    null

                const isUnlimited = Number(debtLimit) === 0
                setLimitMeta({
                    loaded: true,
                    isUnlimited,
                    remaining: isUnlimited ? null : remainingLimit
                })
            } catch (err) {
                console.error('Failed to load subscription limit:', err)
                setLimitMeta((prev) => ({ ...prev, loaded: true }))
            }
        }

        loadSubscriptionLimit()
    }, [])

    const loadStaff = async () => {
        try {
            const response = await staffApi.getStaff()
            const staffList = Array.isArray(response) ? response : (response.data || [])
            setStaffMembers(staffList)
        } catch (err) {
            console.error('Failed to load staff:', err)
            setStaffMembers([])
        }
    }

    const loadData = async () => {
        try {
            const customerId = parseInt(id)
            const [customerData, debtsData, paymentsData] = await Promise.all([
                customersApi.getCustomer(id),
                debtsApi.getDebts({ per_page: 100 }),
                paymentsApi.getPayments({ customer_id: customerId, per_page: 100 })
            ])
            setCustomer(customerData.data || customerData)
            // Filter debts to only show this customer's debts
            const allDebts = Array.isArray(debtsData) ? debtsData : (debtsData.data || [])
            const customerDebts = allDebts.filter(d =>
                d.customer_id === customerId ||
                d.customer?.id === customerId
            )
            setDebts(customerDebts)

            // Filter payments (customer filter server tomonidan bo'lsa ham qo'shimcha filter)
            const allPayments = Array.isArray(paymentsData) ? paymentsData : (paymentsData.data || [])
            const custPayments = allPayments.filter(p => {
                const pid = p.customer_id ?? p.customerId ?? p.customer?.id ?? null
                return String(pid) === String(customerId)
            })
            const sortedPayments = custPayments.sort((a, b) => {
                const ta = a.created_at ? new Date(a.created_at).getTime() : 0
                const tb = b.created_at ? new Date(b.created_at).getTime() : 0
                return tb - ta
            })
            setCustomerPayments(sortedPayments)
        } catch (err) {
            console.error('Failed to load customer:', err)
            if (err.response?.status === 404) navigate('/customers')
        } finally {
            setLoading(false)
        }
    }

    const handleAddDebt = async (e) => {
        e.preventDefault()
        const numericAmount = parseCurrency(debtForm.amount)
        if (!numericAmount) return
        const prevBalance = customerBalance
        setSubmitting(true)
        setDebtErrors({})
        try {
            await debtsApi.createDebt({
                customer_id: parseInt(id),
                total_amount: numericAmount,
                description: debtForm.description || null,
                debt_date: debtForm.debt_date || null,
                send_sms: debtForm.send_sms
            })
            setDebtForm({ amount: '', description: '', debt_date: '', send_sms: false })
            setDebtErrors({})
            setShowDebtDrawer(false)
            await loadData()
            const newDebts = debts
            const newDebt = newDebts.length > 0 ? [...newDebts].sort((a,b) => (b.id||0) - (a.id||0))[0] : null
            toast.success(
                <div>
                    <p className="font-bold">Nasiya qo'shildi</p>
                    <p className="text-sm">
                        {newDebt ? `${formatCurrency(newDebt.total_amount)} so'm • Qoldi: ${formatCurrency(newDebt.remaining_amount)} so'm` : ''}
                        {prevBalance > 0 ? <span className="block text-[11px] text-emerald-600 mt-1">Balans {formatCurrency(prevBalance)} so'm avtomatik ayirildi</span> : ''}
                    </p>
                </div>,
                { duration: 5000 }
            )
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                setDebtErrors(err.response.data.errors)
            } else {
                toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
            }
        } finally {
            setSubmitting(false)
        }
    }

    const customerBalance = useMemo(() => pickAnyNum(customer, [
        ['balance', 'ui_balance', 'available_balance', 'customer_balance', 'c_balance'],
        ['wallet_balance', 'wallet_amount', 'wallet'],
        ['current_balance', 'total_balance', 'user_balance'],
        ['credit_balance', 'deposit', 'deposit_amount'],
        ['account_balance', 'account_amount', 'hisob', 'hisob_mablagi'],
        ['balans', 'balans_mablagi', 'pul_miqdori', 'avans']
    ], 0), [customer])

    const openDebtsNewestFirst = useMemo(() => {
        return debts
            .filter(d => (d.status === 'open' || (Number(d.remaining_amount || 0) > 0 && d.status !== 'closed')))
            .sort((a, b) => {
                const da = a.created_at ? new Date(a.created_at).getTime() : 0
                const db = b.created_at ? new Date(b.created_at).getTime() : 0
                if (db !== da) return db - da
                return (Number(b.id) || 0) - (Number(a.id) || 0)
            })
    }, [debts])

    const genericPaymentAllocationPreview = useMemo(() => {
        const amt = parseCurrency(genericPaymentForm.amount)
        if (!amt || amt <= 0) return null
        if (genericPaymentMode === 'balance') {
            return {
                lines: [{ label: 'Balansga to\'ldirish', amount: amt, type: 'balance' }],
                toBalance: amt,
                toDebtTotal: 0
            }
        }
        // debt mode
        let toPay = amt
        const lines = []
        let totalDebtPaid = 0
        const ordered = openDebtsNewestFirst
        for (const d of ordered) {
            if (toPay <= 0) break
            const rem = Number(d.remaining_amount) || 0
            if (rem <= 0) continue
            const pay = Math.min(toPay, rem)
            lines.push({
                label: `Qarz #${d.id} (avtomatik)`,
                amount: pay,
                type: 'debt',
                debtId: d.id
            })
            totalDebtPaid += pay
            toPay -= pay
        }
        const toBalance = toPay > 0 ? toPay : 0
        if (toBalance > 0) {
            lines.push({ label: 'Qolgan summa balansga', amount: toBalance, type: 'balance' })
        }
        return { lines, toBalance, toDebtTotal: totalDebtPaid }
    }, [genericPaymentForm.amount, genericPaymentMode, openDebtsNewestFirst])

    const selectedDebtForPayment = useMemo(() => {
        if (!debtPaymentForm.debt_id) return null
        return debts.find(d => Number(d.id) === Number(debtPaymentForm.debt_id)) || null
    }, [debts, debtPaymentForm.debt_id])

    const selectedDebtRemaining = useMemo(() => {
        if (!selectedDebtForPayment) return 0
        return parseFloat(selectedDebtForPayment.remaining_amount) || 0
    }, [selectedDebtForPayment])

    // 🔵 YASHIL TEPADAGI UMUMIY TO'LOV
    const handleAddGenericPayment = async (e) => {
        e.preventDefault()
        const totalPayment = parseCurrency(genericPaymentForm.amount)
        if (!totalPayment || totalPayment <= 0) return
        let remainingPayment = totalPayment
        const cid = parseInt(id)
        let ordered = [...openDebtsNewestFirst]

        setSubmitting(true)
        setGenericPaymentErrors({})
        try {
            if (genericPaymentMode === 'debt') {
                for (const debt of ordered) {
                    if (remainingPayment <= 0) break
                    const debtBalance = parseFloat(debt.remaining_amount) || 0
                    if (debtBalance <= 0) continue
                    const paymentForThisDebt = Math.min(remainingPayment, debtBalance)
                    if (paymentForThisDebt > 0) {
                        await paymentsApi.createPayment({
                            customer_id: cid,
                            debt_id: debt.id,
                            amount: paymentForThisDebt,
                            paid_at: genericPaymentForm.paid_at || null,
                            send_sms: genericPaymentForm.send_sms,
                            description: genericPaymentForm.description || null,
                            payment_type: 'debt_payment'
                        })
                        remainingPayment -= paymentForThisDebt
                    }
                }
            }
            if (remainingPayment > 0) {
                await paymentsApi.createPayment({
                    customer_id: cid,
                    debt_id: null,
                    amount: remainingPayment,
                    paid_at: genericPaymentForm.paid_at || null,
                    send_sms: genericPaymentForm.send_sms,
                    description: genericPaymentForm.description || null,
                    payment_type: 'customer_balance'
                })
            }
            setGenericPaymentForm({ amount: '', description: '', paid_at: '', send_sms: false })
            setGenericPaymentMode('debt')
            setGenericPaymentErrors({})
            setShowGenericPaymentDrawer(false)
            const totalToDebt = totalPayment - remainingPayment
            const totalToBal = remainingPayment
            toast.success(
                <div>
                    <p className="font-bold">To'lov qabul qilindi</p>
                    <p className="text-sm">
                        {totalToDebt > 0 && <span className="block">Qarzlar uchun: {formatCurrency(totalToDebt)} so'm</span>}
                        {totalToBal > 0 && <span className="block text-emerald-600">Balansga: {formatCurrency(totalToBal)} so'm</span>}
                    </p>
                </div>,
                { duration: 4500 }
            )
            loadData()
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                setGenericPaymentErrors(err.response.data.errors)
            } else {
                toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
            }
        } finally {
            setSubmitting(false)
        }
    }

    // 🔵 KARTADAGI NASIYA UCHUN TO'LOV (faqat 1 ta debt_id, cheklov)
    const handleAddDebtSpecificPayment = async (e) => {
        e.preventDefault()
        const cid = parseInt(id)
        const totalPayment = parseCurrency(debtPaymentForm.amount)
        if (!totalPayment || totalPayment <= 0) return
        const targetDebt = selectedDebtForPayment
        if (!targetDebt) {
            toast.error('Nasiya topilmadi')
            return
        }
        const rem = selectedDebtRemaining
        // 🔴 Cheklov: kiritilgan summa qoldiqdan oshmasligi kerak
        if (totalPayment > rem) {
            const msg = `Kiritilgan summa (${formatCurrency(totalPayment)} so'm) qolgan qarzdan (${formatCurrency(rem)} so'm) ko'p. To'lov summasini kamaytiring.`
            setDebtPaymentErrors({ amount: [msg] })
            toast.error(msg, { duration: 5000 })
            return
        }

        setSubmitting(true)
        setDebtPaymentErrors({})
        try {
            await paymentsApi.createPayment({
                customer_id: cid,
                debt_id: targetDebt.id,
                amount: totalPayment,
                paid_at: debtPaymentForm.paid_at || null,
                send_sms: debtPaymentForm.send_sms,
                description: null,
                payment_type: 'debt_payment'
            })
            setDebtPaymentForm({ debt_id: null, amount: '', paid_at: '', send_sms: false })
            setDebtPaymentErrors({})
            setShowDebtPaymentDrawer(false)
            toast.success(
                <div>
                    <p className="font-bold">To'lov qabul qilindi (nasiya #{targetDebt.id})</p>
                    <p className="text-sm">{formatCurrency(totalPayment)} so'm • Yangi qoldiq: {formatCurrency(Math.max(0, rem - totalPayment))} so'm</p>
                </div>,
                { duration: 4500 }
            )
            loadData()
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                setDebtPaymentErrors(err.response.data.errors)
            } else {
                toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleCall = () => {
        if (customer?.phone) window.location.href = `tel:${customer.phone}`
    }

    const handleMessage = () => {
        if (subStatus === 'expired') {
            setBlockedType('expired')
            setShowBlockedDrawer(true)
            return
        }
        if (customer?.phone) window.location.href = `sms:${customer.phone}`
    }

    const handleDelete = async () => {
        setSubmitting(true)
        try {
            await customersApi.deleteCustomer(id)
            toast.success('Mijoz o\'chirildi')
            navigate('/customers')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSubmitting(false)
            setShowDeleteConfirm(false)
        }
    }

    const formatPhone = (phone) => {
        if (!phone) return ''
        const cleaned = phone.replace(/\D/g, '')
        if (cleaned.length === 12) {
            return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`
        }
        return phone
    }

    const getStaffNameById = (userId) => {
        if (!userId) return null
        const staff = staffMembers.find((s) => String(s.id) === String(userId))
        return staff?.name || null
    }

    const getCreatorName = (item) => {
        if (!item) return null
        // Direct createdBy object with name
        if (item.createdBy && typeof item.createdBy === 'object' && item.createdBy.name) {
            return item.createdBy.name
        }
        // Try user ID
        const userId = item.created_by_user_id || item.user_id
        if (userId) {
            const creator = getStaffNameById(userId)
            if (creator) return creator
        }
        return null
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

    if (loading) {
        return <CustomerDetailSkeleton />
    }

    if (!customer) {
        return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Mijoz topilmadi</p></div>
    }

    const sumRemaining = debts.reduce((sum, d) => sum + (parseFloat(d.remaining_amount) || 0), 0)
    const hasOutstandingDebt = debts.some((d) => (parseFloat(d.remaining_amount) || 0) > 0)
    const sumPaid = customerPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

    const formatDateShort = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const yyyy = date.getFullYear()
        return `${mm}/${dd}/${yyyy}`
    }

    const totalDebt = debts.length > 0
        ? sumRemaining
        : parseFloat(
            customer.remaining_amount ??
            customer.remaining_debts ??
            customer.debt_sum ??
            customer.total_debt ?? 0
        )
    const effectiveIsUnlimited = limitMeta.loaded ? limitMeta.isUnlimited : (remaining == null && total == null)
    const effectiveRemaining = limitMeta.loaded ? limitMeta.remaining : remaining
    const hasKnownDebtRemaining = effectiveRemaining !== null && effectiveRemaining !== undefined && effectiveRemaining !== ''
    // Only block by limit when we have a reliable remaining value.
    const isDebtLimitReached = !effectiveIsUnlimited && hasKnownDebtRemaining && Number(effectiveRemaining) <= 0

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-24 transition-colors overflow-x-hidden">
            {/* Unified Hero Section */}
            <div className="px-4 mt-2">
                <div className="bg-white dark:bg-gray-800 pt-2 pb-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 transition-all">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-0.5 mb-1">
                        <button 
                            onClick={() => navigate(-1)} 
                            className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center active:scale-90 transition-transform"
                        >
                            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
                        </button>
                        <button
                            onClick={() => setShowOptionsDrawer(true)}
                            className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center active:scale-90 transition-transform"
                        >
                            <MoreVertical size={18} className="text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>

                    {/* Profile & Balance Info */}
                    <div className="flex flex-col items-center text-center px-6">
                        <h1 className="text-[18px] font-bold text-gray-900 dark:text-white mb-0.5 leading-tight">
                            {customer.name}
                        </h1>
                        <p className="text-gray-400 dark:text-gray-500 text-[12px] font-medium mb-2.5">
                            {formatPhone(customer.phone)}
                        </p>

                        <div className={`text-[28px] font-extrabold tracking-tight mb-2 ${totalDebt > 0 ? 'text-red-500' : (customerBalance > 0 ? 'text-emerald-500' : 'text-green-500')}`}>
                            {formatCurrency(totalDebt)} <span className="text-[14px] font-bold opacity-70">so'm</span>
                        </div>

                        <div className={`inline-flex items-center px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            totalDebt > 0 
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-900/30' 
                                : 'bg-green-50 dark:bg-green-900/20 text-green-500 border border-green-100 dark:border-green-900/30'
                        }`}>
                            {totalDebt > 0 ? 'Qarzdor' : (customerBalance > 0 ? 'Balans mavjud' : 'To\'langan')}
                        </div>

                        {customerBalance > 0 && (
                            <div className="mt-3 w-full px-2">
                                <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                                            <Wallet size={17} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-bold uppercase tracking-wider">Shaxsiy balans</p>
                                            <p className="text-[15px] font-extrabold text-emerald-700 dark:text-emerald-300 leading-tight">
                                                {formatCurrency(customerBalance)} <span className="text-[12px] opacity-70 font-bold">so'm</span>
                                            </p>
                                        </div>
                                    </div>
                                    <CheckCircle2 size={18} className="text-emerald-500/80" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 mt-4">
                <div className="flex gap-3 mb-3">
                    <button onClick={handleCall} className="btn btn-outline flex-1 py-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"><PhoneIcon size={18} />Qo'ng'iroq</button>
                    <button onClick={handleMessage} className="btn btn-outline flex-1 py-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"><MessageSquare size={18} />Xabar</button>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            if (subStatus === 'expired') {
                                setBlockedType('expired')
                                setShowBlockedDrawer(true)
                            } else if (isDebtLimitReached) {
                                setBlockedType('limit')
                                setShowBlockedDrawer(true)
                            } else {
                                setShowDebtDrawer(true)
                            }
                        }} 
                        className={`btn flex-1 py-3 shadow-lg active:scale-95 transition-all ${
                            subStatus === 'expired' || isDebtLimitReached
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 border border-gray-100 dark:border-gray-600'
                                : 'btn-danger shadow-red-500/20'
                        }`}
                    >
                        <Plus size={18} />Nasiya
                    </button>
                    <button
                        onClick={() => setShowGenericPaymentDrawer(true)}
                        className="btn flex-1 py-3 shadow-lg active:scale-95 transition-all btn-success shadow-green-500/20"
                    >
                        <Plus size={18} />To'lov
                    </button>
                </div>
            </div>

            {/* Timeline (Tarix) */}
            <div className="px-4 mt-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">Tarix</h2>
                    <span className="text-[13px] text-gray-400">
                        {historyTab === 'debts' ? `${debts.length} ta nasiya` : `${customerPayments.length} ta to'lov`}
                    </span>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-5">
                    <button
                        type="button"
                        onClick={() => setHistoryTab('debts')}
                        className={`py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                            historyTab === 'debts'
                                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400'
                        }`}
                    >
                        <FileText size={13} className="inline mr-1 -mt-0.5" />
                        Nasiyalar
                    </button>
                    <button
                        type="button"
                        onClick={() => setHistoryTab('payments')}
                        className={`py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                            historyTab === 'payments'
                                ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400'
                        }`}
                    >
                        <CreditCard size={13} className="inline mr-1 -mt-0.5" />
                        To'lovlar
                        {sumPaid > 0 && (
                            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(sumPaid)}
                            </span>
                        )}
                    </button>
                </div>

                {/* Nasiyalar tab */}
                {historyTab === 'debts' && (
                    <>
                        {debts.length === 0 ? (
                            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                                    <FileText size={20} className="text-gray-400" />
                                </div>
                                <div className="text-gray-400">Hali nasiya yo'q</div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {debts.map(debt => (
                                    <div key={debt.id} className="card !p-4 border-0 shadow-sm bg-white dark:bg-gray-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className={`badge px-2 py-0.5 rounded-lg text-[11px] ${debt.status === 'closed' ? 'badge-paid' : 'badge-debtor'}`}>
                                                {debt.status === 'closed' ? 'Yopilgan' : 'Faol'}
                                            </span>
                                            <div className="text-right">
                                                <div className="text-[11px] text-gray-400">{formatDate(debt.created_at)}</div>
                                                {getCreatorName(debt) && (
                                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {getCreatorName(debt)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Berildi</p>
                                                <p className="text-[16px] font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(debt.total_amount)} <span className="text-[12px] font-normal opacity-60">so'm</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Qoldi</p>
                                                <p className={`text-[16px] font-bold ${debt.remaining_amount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {formatCurrency(debt.remaining_amount)} <span className="text-[12px] font-normal opacity-60">so'm</span>
                                                </p>
                                            </div>
                                        </div>

                                        {debt.description && (
                                            <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-4">
                                                <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-tight">
                                                    {debt.description}
                                                </p>
                                            </div>
                                        )}

                                        {debt.status !== 'closed' && (
                                            <button
                                                onClick={() => {
                                                    const rem = parseFloat(debt.remaining_amount) || 0
                                                    setDebtPaymentForm({
                                                        debt_id: debt.id,
                                                        amount: rem > 0 ? formatCurrency(String(Math.round(rem))) : '',
                                                        paid_at: '',
                                                        send_sms: false
                                                    })
                                                    setDebtPaymentErrors({})
                                                    setShowDebtPaymentDrawer(true)
                                                }}
                                                className="btn btn-primary w-full py-2.5 text-[14px] bg-blue-500 hover:bg-blue-600 text-white border-0"
                                            >
                                                <CreditCard size={16} />
                                                To'lov qilish
                                            </button>
                                        )}

                                        <Link
                                            to={`/debts/${debt.id}`}
                                            className="block text-center mt-3 text-[13px] text-blue-500 font-semibold"
                                        >
                                            Batafsil ko'rish
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* To'lovlar tab */}
                {historyTab === 'payments' && (
                    <>
                        {customerPayments.length === 0 ? (
                            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center">
                                    <CreditCard size={20} className="text-gray-400" />
                                </div>
                                <div className="text-gray-400">Hali to'lov yo'q</div>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {customerPayments.map(pay => {
                                    const pType = String(pay.payment_type || '').toLowerCase()
                                    const dId = pay.debt_id ?? pay.debtId ?? pay.debt?.id
                                    const isBalance = pType.includes('balance') || pType.includes('customer') || pType.includes('deposit') || pType.includes('umumiy')
                                        || (dId === null || dId === undefined || String(dId) === '0' || String(dId) === 'null')
                                    const amt = parseFloat(pay.amount) || 0
                                    return (
                                        <Link
                                            key={pay.id}
                                            to={isBalance || !dId ? null : `/debts/${dId}`}
                                            onClick={(e) => { if (!dId || isBalance) e.preventDefault() }}
                                            className={`card !p-3.5 border-0 shadow-sm bg-white dark:bg-gray-800 flex items-center gap-3 active:scale-[0.99] transition-transform ${(!dId || isBalance) ? 'cursor-default' : 'cursor-pointer'}`}
                                        >
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                                isBalance
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                                    : 'bg-green-50 dark:bg-green-900/20'
                                            }`}>
                                                {isBalance
                                                    ? <Wallet size={19} className="text-emerald-500" />
                                                    : <CheckCircle2 size={19} className="text-green-500" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                                        isBalance
                                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/30'
                                                            : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100/60 dark:border-green-900/30'
                                                    }`}>
                                                        {isBalance ? 'Balansga' : (dId ? `Qarz #${dId}` : 'To\'lov')}
                                                    </span>
                                                    {!isBalance && dId && (
                                                        <span className="text-[10px] text-gray-400">
                                                            • {formatDateShort(pay.created_at || pay.paid_at)}
                                                        </span>
                                                    )}
                                                </div>
                                                {pay.description && (
                                                    <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-0.5 line-clamp-1">
                                                        {pay.description}
                                                    </p>
                                                )}
                                                {getCreatorName(pay) && (
                                                    <p className="text-[11px] text-gray-400 line-clamp-1">
                                                        Qabul qilgan: <span className="font-semibold text-gray-500 dark:text-gray-300">{getCreatorName(pay)}</span>
                                                    </p>
                                                )}
                                                {!getCreatorName(pay) && !pay.description && (
                                                    <p className="text-[11px] text-gray-400">
                                                        {formatDate(pay.paid_at || pay.created_at)}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-right flex-shrink-0 pl-2">
                                                <p className="text-[15px] font-extrabold text-green-600 dark:text-green-400 leading-none mb-0.5">
                                                    +{formatCurrency(amt)}
                                                </p>
                                                <p className="text-[11px] text-gray-400 font-normal">so'm</p>
                                            </div>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Add Debt Drawer */}
            <Drawer.Root open={showDebtDrawer} onOpenChange={(open) => {
                setShowDebtDrawer(open)
                if (!open) {
                    setTimeout(() => {
                        setDebtForm({ amount: '', description: '', debt_date: '', send_sms: false })
                        setDebtErrors({})
                    }, 300)
                }
            }} repositionInputs={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh] outline-none">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                        Nasiya qo'shish
                                    </Drawer.Title>
                                    <Drawer.Description className="text-gray-400 text-[14px]">
                                        {customer.name} uchun yangi nasiya
                                    </Drawer.Description>
                                </div>
                                <button onClick={() => setShowDebtDrawer(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>
                            <div className="overflow-y-auto max-h-[calc(85vh-80px)] px-4 pb-8">
                                <form onSubmit={handleAddDebt} className="space-y-4">
                                    <div>
                                        <label className="label">Summa</label>
                                        <div className="relative">
                                            <CreditCard size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${debtErrors.total_amount ? 'text-red-400' : 'text-gray-400'}`} />
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                className={`input pl-11 pr-16 ${debtErrors.total_amount ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                                placeholder="0"
                                                value={debtForm.amount}
                                                onChange={(e) => {
                                                    const digits = e.target.value.replace(/\D/g, '')
                                                    setDebtForm({
                                                        ...debtForm,
                                                        amount: digits ? formatCurrency(digits) : ''
                                                    })
                                                    if (debtErrors.total_amount) setDebtErrors({ ...debtErrors, total_amount: null })
                                                }}
                                                required
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">so'm</span>
                                        </div>
                                        {debtErrors.total_amount && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{debtErrors.total_amount[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="label">Izoh (ixtiyoriy)</label>
                                        <div className="relative">
                                            <FileText size={18} className={`absolute left-4 top-4 ${debtErrors.description ? 'text-red-400' : 'text-gray-400'}`} />
                                            <textarea
                                                className={`input pl-11 min-h-[80px] resize-none ${debtErrors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                                placeholder="Tavsif qo'shish..."
                                                value={debtForm.description}
                                                onChange={(e) => {
                                                    setDebtForm({ ...debtForm, description: e.target.value })
                                                    if (debtErrors.description) setDebtErrors({ ...debtErrors, description: null })
                                                }}
                                            />
                                        </div>
                                        {debtErrors.description && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{debtErrors.description[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="label">Nasiya sanasi (ixtiyoriy)</label>
                                        <input
                                            type="date"
                                            className={`input ${debtErrors.debt_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                            value={debtForm.debt_date}
                                            min={new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => {
                                                setDebtForm({ ...debtForm, debt_date: e.target.value })
                                                if (debtErrors.debt_date) setDebtErrors({ ...debtErrors, debt_date: null })
                                            }}
                                        />
                                        {debtErrors.debt_date && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{debtErrors.debt_date[0]}</p>}
                                        <p className="text-[12px] text-gray-400 mt-1">
                                            Bo'sh qolsa bugun olinadi. Oxirgi 1 oy ichida.
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                                        <div className="flex-1">
                                            <label htmlFor="customer_send_sms" className="text-[14px] font-bold text-gray-700 dark:text-gray-200 block">
                                                Mijozga SMS yuborish
                                            </label>
                                            <p className="text-[11px] text-gray-400 opacity-80">
                                                {sms_remaining != null ? `Qolgan SMS: ${sms_remaining} ta` : 'Limitdan keyin balansdan yechiladi.'}
                                            </p>
                                        </div>
                                        <button
                                            id="customer_send_sms"
                                            type="button"
                                            role="switch"
                                            aria-checked={debtForm.send_sms}
                                            className="ios-switch"
                                            data-state={debtForm.send_sms ? 'checked' : 'unchecked'}
                                            onClick={() => setDebtForm({ ...debtForm, send_sms: !debtForm.send_sms })}
                                        >
                                            <span className="ios-switch-thumb" />
                                        </button>
                                    </div>

                                    {/* Limits Info */}
                                    <div className="grid grid-cols-2 gap-3 mb-2">
                                        <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                                            <p className="text-[11px] text-blue-500 uppercase font-bold tracking-wider mb-0.5">Nasiya Limiti</p>
                                            <p className="text-[14px] font-bold text-blue-600 dark:text-blue-400">
                                                {effectiveIsUnlimited ? 'Cheksiz' : `${effectiveRemaining ?? 0} ta qoldi`}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20">
                                            <p className="text-[11px] text-emerald-500 uppercase font-bold tracking-wider mb-0.5">SMS Limiti</p>
                                            <p className="text-[14px] font-bold text-emerald-600 dark:text-emerald-400">
                                                {sms_remaining ?? 0} ta qoldi
                                            </p>
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-orange w-full py-4 text-[16px] font-bold" disabled={submitting}>
                                        {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Saqlash'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* 🔵 UMUMIY TO'LOV DRAWER (yashil "To'lov" tugmasi) */}
            <Drawer.Root open={showGenericPaymentDrawer} onOpenChange={(open) => {
                setShowGenericPaymentDrawer(open)
                if (!open) {
                    setTimeout(() => {
                        setGenericPaymentForm({ amount: '', description: '', paid_at: '', send_sms: false })
                        setGenericPaymentMode('debt')
                        setGenericPaymentErrors({})
                    }, 300)
                }
            }} repositionInputs={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh] outline-none">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                        To'lov qo'shish (umumiy)
                                    </Drawer.Title>
                                    <Drawer.Description className="text-gray-400 text-[14px]">
                                        {customer.name} uchun umumiy to'lov
                                    </Drawer.Description>
                                </div>
                                <button onClick={() => setShowGenericPaymentDrawer(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>
                            <div className="overflow-y-auto max-h-[calc(85vh-80px)] pb-8">
                                <form onSubmit={handleAddGenericPayment} className="space-y-4">
                                    {customerBalance > 0 && (
                                        <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-900/15 border border-emerald-100/60 dark:border-emerald-900/40">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                                                <Wallet size={15} className="text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/80 font-bold uppercase tracking-wider">Hozirgi balans</p>
                                                <p className="text-[14px] font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(customerBalance)} so'm</p>
                                            </div>
                                        </div>
                                    )}

                                    {openDebtsNewestFirst.length > 0 ? (
                                        <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-900/15 border border-blue-100/60 dark:border-blue-900/40">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                                                    <Tag size={13} className="text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <p className="text-[12px] text-blue-700/90 dark:text-blue-300/90 leading-snug">
                                                    To'lov <b className="font-extrabold">eng yangi (oxirgi) qarzdan</b> boshlab avtomatik tarzda taqsimlanadi.
                                                    Barcha qarzor to'langanidan keyin ortiqcha summa <b className="text-emerald-600 dark:text-emerald-400">balansga</b> qo'shiladi.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-900/15 border border-emerald-100/60 dark:border-emerald-900/40">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                                                    <Wallet size={13} className="text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <p className="text-[12px] text-emerald-700/90 dark:text-emerald-300/90 leading-snug">
                                                    Faol qarz yo'q. Kiritilgan summa to'liq <b className="font-extrabold">shaxsiy balansga</b> qo'shiladi.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="label">Summa</label>
                                        <div className="relative">
                                            <CreditCard size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${genericPaymentErrors.amount ? 'text-red-400' : 'text-gray-400'}`} />
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                className={`input pl-11 pr-16 ${genericPaymentErrors.amount ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                                placeholder="0"
                                                value={genericPaymentForm.amount}
                                                onChange={(e) => {
                                                    const digits = e.target.value.replace(/\D/g, '')
                                                    setGenericPaymentForm({
                                                        ...genericPaymentForm,
                                                        amount: digits ? formatCurrency(digits) : ''
                                                    })
                                                    if (genericPaymentErrors.amount) setGenericPaymentErrors({ ...genericPaymentErrors, amount: null })
                                                }}
                                                required
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">so'm</span>
                                        </div>
                                        {genericPaymentErrors.amount && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{genericPaymentErrors.amount[0]}</p>}
                                    </div>

                                    {/* Allocation Preview */}
                                    {genericPaymentAllocationPreview && (
                                        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-3 space-y-2">
                                            <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Taqqoslash (avtomatik)</p>
                                            {genericPaymentAllocationPreview.lines.map((ln, idx) => (
                                                <div key={idx} className="flex items-center justify-between text-[13px]">
                                                    <div className="flex items-center gap-2">
                                                        {ln.type === 'debt' ? (
                                                            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center">
                                                                <Tag size={12} className="text-blue-500" />
                                                            </div>
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                                                                <Wallet size={12} className="text-emerald-500" />
                                                            </div>
                                                        )}
                                                        <span className={`font-medium ${ln.type === 'debt' ? 'text-gray-700 dark:text-gray-200' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                                            {ln.label}
                                                        </span>
                                                    </div>
                                                    <span className={`font-bold ${ln.type === 'debt' ? 'text-gray-800 dark:text-gray-100' : 'text-emerald-700 dark:text-emerald-300'}`}>
                                                        {formatCurrency(ln.amount)} so'm
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-1 flex items-center justify-between">
                                                <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                                                    Jami taqsimlash
                                                </span>
                                                <span className="text-[13px] font-extrabold text-gray-900 dark:text-white">
                                                    {formatCurrency(
                                                        genericPaymentAllocationPreview.toDebtTotal + genericPaymentAllocationPreview.toBalance
                                                    )} so'm
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="label">To'lov sanasi (ixtiyoriy)</label>
                                        <input
                                            type="date"
                                            className={`input ${genericPaymentErrors.paid_at ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                            value={genericPaymentForm.paid_at}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => {
                                                setGenericPaymentForm({ ...genericPaymentForm, paid_at: e.target.value })
                                                if (genericPaymentErrors.paid_at) setGenericPaymentErrors({ ...genericPaymentErrors, paid_at: null })
                                            }}
                                        />
                                        {genericPaymentErrors.paid_at && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{genericPaymentErrors.paid_at[0]}</p>}
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                                        <div className="flex-1">
                                            <label htmlFor="generic_payment_send_sms" className="text-[14px] font-bold text-gray-700 dark:text-gray-200 block">
                                                Mijozga SMS yuborish
                                            </label>
                                            <p className="text-[11px] text-gray-400 opacity-80">
                                                Limitdan keyin balansdan yechiladi.
                                            </p>
                                        </div>
                                        <button
                                            id="generic_payment_send_sms"
                                            type="button"
                                            role="switch"
                                            aria-checked={genericPaymentForm.send_sms}
                                            className="ios-switch"
                                            data-state={genericPaymentForm.send_sms ? 'checked' : 'unchecked'}
                                            onClick={() => setGenericPaymentForm({ ...genericPaymentForm, send_sms: !genericPaymentForm.send_sms })}
                                        >
                                            <span className="ios-switch-thumb" />
                                        </button>
                                    </div>
                                    <button type="submit" className="btn btn-orange w-full py-4 text-[16px] font-bold" disabled={submitting}>
                                        {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Saqlash'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* 🔴 NASIYA UCHUN ALOHIDA TO'LOV DRAWER (kartadagi "To'lov qilish") */}
            <Drawer.Root open={showDebtPaymentDrawer} onOpenChange={(open) => {
                setShowDebtPaymentDrawer(open)
                if (!open) {
                    setTimeout(() => {
                        setDebtPaymentForm({ debt_id: null, amount: '', paid_at: '', send_sms: false })
                        setDebtPaymentErrors({})
                    }, 300)
                }
            }} repositionInputs={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh] outline-none">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                        {selectedDebtForPayment ? `Nasiya #${selectedDebtForPayment.id} uchun to'lov` : 'Nasiya uchun to\'lov'}
                                    </Drawer.Title>
                                    <Drawer.Description className="text-gray-400 text-[14px]">
                                        {customer.name} • Faqat tanlangan nasiya
                                    </Drawer.Description>
                                </div>
                                <button onClick={() => setShowDebtPaymentDrawer(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>
                            <div className="overflow-y-auto max-h-[calc(85vh-80px)] pb-8">
                                <form onSubmit={handleAddDebtSpecificPayment} className="space-y-4">
                                    {selectedDebtForPayment && (
                                        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-900/15 border border-blue-100/60 dark:border-blue-900/40 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                                                        <Tag size={15} className="text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <p className="text-[12px] text-blue-600/80 dark:text-blue-400/80 font-bold uppercase tracking-wider">Tanlangan nasiya</p>
                                                </div>
                                                <span className="text-[11px] text-gray-500 dark:text-gray-400">{formatDate(selectedDebtForPayment.created_at)}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Berildi</p>
                                                    <p className="text-[15px] font-bold text-gray-800 dark:text-gray-200">{formatCurrency(selectedDebtForPayment.total_amount)} so'm</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[11px] text-red-500 uppercase font-bold tracking-wider mb-0.5">Qoldi (maksimum)</p>
                                                    <p className="text-[15px] font-extrabold text-red-600 dark:text-red-400">{formatCurrency(selectedDebtRemaining)} so'm</p>
                                                </div>
                                            </div>
                                            {selectedDebtForPayment.description && (
                                                <p className="text-[12px] text-gray-500 dark:text-gray-400 border-t border-blue-100/60 dark:border-blue-900/40 pt-2">
                                                    {selectedDebtForPayment.description}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <div>
                                        <label className="label">Summa (qoldiqdan oshmasligi kerak)</label>
                                        <div className="relative">
                                            <CreditCard size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${debtPaymentErrors.amount ? 'text-red-400' : 'text-gray-400'}`} />
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                className={`input pl-11 pr-16 ${debtPaymentErrors.amount ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                                placeholder="0"
                                                value={debtPaymentForm.amount}
                                                onChange={(e) => {
                                                    const digits = e.target.value.replace(/\D/g, '')
                                                    const numeric = digits ? Number(digits) : 0
                                                    let nextVal = digits ? formatCurrency(digits) : ''
                                                    let nextErrors = { ...debtPaymentErrors }
                                                    if (numeric > selectedDebtRemaining && selectedDebtRemaining > 0) {
                                                        nextErrors.amount = [
                                                            `Kiritilgan summa (${formatCurrency(String(numeric))} so'm) qolgan qarzdan (${formatCurrency(selectedDebtRemaining)} so'm) ko'p. Maksimum: ${formatCurrency(selectedDebtRemaining)} so'm.`
                                                        ]
                                                    } else if (nextErrors.amount) {
                                                        nextErrors.amount = null
                                                    }
                                                    setDebtPaymentForm({ ...debtPaymentForm, amount: nextVal })
                                                    setDebtPaymentErrors(nextErrors)
                                                }}
                                                max={selectedDebtRemaining > 0 ? String(selectedDebtRemaining) : undefined}
                                                required
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">so'm</span>
                                        </div>
                                        {selectedDebtRemaining > 0 && (
                                            <div className="flex items-center justify-between mt-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDebtPaymentForm({
                                                            ...debtPaymentForm,
                                                            amount: formatCurrency(String(Math.round(selectedDebtRemaining)))
                                                        })
                                                        if (debtPaymentErrors.amount) setDebtPaymentErrors({ ...debtPaymentErrors, amount: null })
                                                    }}
                                                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 underline-offset-2 hover:underline"
                                                >
                                                    To'liq summani kirit ({formatCurrency(selectedDebtRemaining)})
                                                </button>
                                                <span className="text-[11px] text-gray-400">
                                                    Maks: <b className="text-gray-700 dark:text-gray-300">{formatCurrency(selectedDebtRemaining)} so'm</b>
                                                </span>
                                            </div>
                                        )}
                                        {debtPaymentErrors.amount && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{debtPaymentErrors.amount[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="label">To'lov sanasi (ixtiyoriy)</label>
                                        <input
                                            type="date"
                                            className={`input ${debtPaymentErrors.paid_at ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                            value={debtPaymentForm.paid_at}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => {
                                                setDebtPaymentForm({ ...debtPaymentForm, paid_at: e.target.value })
                                                if (debtPaymentErrors.paid_at) setDebtPaymentErrors({ ...debtPaymentErrors, paid_at: null })
                                            }}
                                        />
                                        {debtPaymentErrors.paid_at && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{debtPaymentErrors.paid_at[0]}</p>}
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                                        <div className="flex-1">
                                            <label htmlFor="debt_payment_send_sms" className="text-[14px] font-bold text-gray-700 dark:text-gray-200 block">
                                                Mijozga SMS yuborish
                                            </label>
                                            <p className="text-[11px] text-gray-400 opacity-80">
                                                Limitdan keyin balansdan yechiladi.
                                            </p>
                                        </div>
                                        <button
                                            id="debt_payment_send_sms"
                                            type="button"
                                            role="switch"
                                            aria-checked={debtPaymentForm.send_sms}
                                            className="ios-switch"
                                            data-state={debtPaymentForm.send_sms ? 'checked' : 'unchecked'}
                                            onClick={() => setDebtPaymentForm({ ...debtPaymentForm, send_sms: !debtPaymentForm.send_sms })}
                                        >
                                            <span className="ios-switch-thumb" />
                                        </button>
                                    </div>
                                    <button type="submit" className="btn btn-primary w-full py-4 text-[16px] font-bold bg-blue-500 hover:bg-blue-600 border-0" disabled={submitting || !!debtPaymentErrors.amount}>
                                        {submitting ? <Loader2 size={20} className="animate-spin" /> : (selectedDebtForPayment ? `Nasiya #${selectedDebtForPayment.id} uchun to'lov` : "Saqlash")}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Options Drawer */}
            <Drawer.Root open={showOptionsDrawer} onOpenChange={setShowOptionsDrawer}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 pb-safe outline-none">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="space-y-2">
                                <button
                                    onClick={() => {
                                        setShowOptionsDrawer(false)
                                        navigate(`/customers/${id}/edit`)
                                    }}
                                    className="w-full flex items-center gap-3 p-4 text-primary-600 dark:text-primary-400 font-bold active:bg-gray-50 dark:active:bg-gray-700/50 rounded-2xl transition-colors"
                                >
                                    <Edit2 size={20} />
                                    <span>Mijozni tahrirlash</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShowOptionsDrawer(false)
                                        setShowDeleteConfirm(true)
                                    }}
                                    className="w-full flex items-center gap-3 p-4 text-red-500 font-bold active:bg-gray-50 dark:active:bg-gray-700/50 rounded-2xl transition-colors"
                                >
                                    <Trash2 size={20} />
                                    <span>Mijozni o'chirish</span>
                                </button>
                                <button
                                    onClick={() => setShowOptionsDrawer(false)}
                                    className="w-full p-4 text-gray-500 font-semibold active:bg-gray-50 dark:active:bg-gray-700/50 rounded-2xl transition-colors"
                                >
                                    Bekor qilish
                                </button>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Delete Confirmation Drawer */}
            <Drawer.Root open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 pb-safe outline-none">
                        <div className="p-6 text-center">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">Mijozni o'chirish</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">
                                Haqiqatan ham <b>{customer.name}</b>ni o'chirmoqchimisiz?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="btn btn-outline flex-1 px-4 py-3"
                                    disabled={submitting}
                                >
                                    Yo'q
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="btn btn-danger flex-1 px-4 py-3"
                                    disabled={submitting}
                                >
                                    {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Ha'}
                                </button>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
            {/* Blocked Action Drawer */}
            <Drawer.Root open={showBlockedDrawer} onOpenChange={setShowBlockedDrawer}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 pb-safe outline-none">
                        <div className="p-6 text-center">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-6" />
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                                blockedType === 'expired' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                            }`}>
                                <AlertCircle size={32} className={blockedType === 'expired' ? 'text-red-500' : 'text-amber-500'} />
                            </div>
                            
                            <h3 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">
                                {blockedType === 'expired' ? 'Obunangiz tugagan' : 'Limit tugadi'}
                            </h3>
                            
                            <p className="text-gray-500 dark:text-gray-400 mb-8 px-4 leading-relaxed">
                                {blockedType === 'expired' ? (
                                    <>
                                        Obunangiz tugagan. Sizda hali <b>{effectiveIsUnlimited ? 'Cheksiz' : (effectiveRemaining ?? 0)}</b> nasiya limiti mavjud.
                                        Yo'qotmaslik uchun obunani yangilang.
                                    </>
                                ) : (
                                    <>
                                        Sizning nasiya limitingiz tugadi.
                                        Qo'shimcha limit sotib oling yoki Pro tarifga o'ting.
                                    </>
                                )}
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                {blockedType === 'expired' ? (
                                    <Link
                                        to="/subscription"
                                        className="btn btn-primary w-full py-4 text-[16px] font-bold"
                                    >
                                        <RefreshCw size={20} className="mr-2" />
                                        Obunani yangilash
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            to="/subscription"
                                            className="btn btn-primary w-full py-4 text-[16px] font-bold"
                                        >
                                            <Zap size={20} className="mr-2" />
                                            Limit sotib olish
                                        </Link>
                                        <Link
                                            to="/subscription"
                                            className="btn btn-outline w-full py-4 text-[16px] font-bold border-blue-500 text-blue-500"
                                        >
                                            Pro tarifga o'tish
                                        </Link>
                                    </>
                                )}
                                <button
                                    onClick={() => setShowBlockedDrawer(false)}
                                    className="p-3 text-gray-400 text-[14px] font-medium"
                                >
                                    Bekor qilish
                                </button>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    )
}
