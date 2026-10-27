import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Drawer } from 'vaul'
import { suppliersApi } from '../api/suppliers.api'
import toast from 'react-hot-toast'
import {
    ChevronLeft, MoreVertical, Phone as PhoneIcon, MessageSquare,
    Plus, CreditCard, Loader2, FileText, X, Trash2, Edit2,
    Wallet, CheckCircle2, Package, TrendingUp, TrendingDown,
    Building2, User, MapPin, Hash, AlertCircle, RefreshCw,
    ShoppingCart, ArrowRightLeft, Calendar, Receipt, BadgeDollarSign
} from 'lucide-react'
import { formatCurrency, parseCurrency } from '../utils/format'
import { todayYmd, toYmd } from '../utils/date'
import LoadingSpinner from '../components/LoadingSpinner'
import SupplierModal from '../components/SupplierModal'

const pickStr = (obj, keys, fallback = null) => {
    if (!obj || typeof obj !== 'object') return fallback
    for (const k of keys) {
        const v = obj[k]
        if (v !== undefined && v !== null && String(v).trim() !== '') return v
        if (k.includes('.')) {
            const parts = k.split('.'); let cur = obj
            for (const p of parts) { cur = cur?.[p]; if (cur === undefined) break }
            if (cur !== undefined && cur !== null && String(cur).trim() !== '') return cur
        }
    }
    return fallback
}

const pickNum = (obj, keys, fallback = 0) => {
    if (!obj || typeof obj !== 'object') return fallback
    for (const k of keys) {
        const v = obj[k]
        if (v === undefined || v === null || v === '') continue
        const n = Number(v)
        if (!Number.isNaN(n)) return n
    }
    return fallback
}

const normalizeSupplier = (raw) => {
    if (!raw) return raw
    return {
        ...raw,
        id: raw.id ?? raw.supplier_id ?? raw.uuid ?? raw._id,
        name: pickStr(raw, ['name', 'company_name', 'full_name', 'title', 'organization_name', 'supplier_name', 'partner_name']),
        company_name: pickStr(raw, ['company_name', 'name', 'organization']),
        phone: pickStr(raw, ['phone', 'tel', 'mobile', 'telephone', 'phone_number', 'contact_phone']),
        contact_person: pickStr(raw, ['contact_person', 'contact', 'manager_name', 'responsible', 'representative', 'person', 'owner', 'contact_name']),
        inn: pickStr(raw, ['inn', 'stir', 'tin', 'inn_stir', 'tin_inn', 'tax_id', 'taxpayer_id']),
        stir: pickStr(raw, ['stir', 'inn', 'tin']),
        address: pickStr(raw, ['address', 'location', 'region_name', 'full_address']),
        note: pickStr(raw, ['note', 'notes', 'comment', 'description', 'extra']),
        status: pickStr(raw, ['status', 'state', 'active_status'], 'active'),
        balance: pickNum(raw, ['balance', 'current_debt', 'debt', 'debt_amount', 'remaining', 'remaining_amount', 'payable', 'total_debt', 'overdue_amount']),
        current_debt: pickNum(raw, ['current_debt', 'debt', 'balance', 'debt_amount']),
        total_bought: pickNum(raw, ['total_bought', 'purchased', 'total_purchase', 'amount_bought', 'total_purchased', 'purchases_total']),
        total_paid: pickNum(raw, ['total_paid', 'paid', 'payment_total', 'amount_paid', 'payments_total']),
        created_at: raw.created_at ?? raw.createdAt ?? raw.date ?? null,
        updated_at: raw.updated_at ?? raw.updatedAt ?? null
    }
}

// SupplierTransaction (type: debt | payment) -> sahifa ko'rinishi
const normalizeMovement = (tx) => {
    if (!tx) return null
    // transaction_date serverdan sof sana (YYYY-MM-DD) keladi: o'girilmaydi
    const ymd = tx.transaction_date || toYmd(tx.created_at)
    return {
        ...tx,
        amount: Number(tx.amount) || 0,
        remaining_amount: Number(tx.remaining_amount) || 0,
        transaction_date: ymd,
        // Sof sana mahalliy yarim tun sifatida: bir kun siljimaydi
        date: ymd ? new Date(`${ymd}T00:00:00`) : new Date(tx.created_at),
        _kind: tx.type === 'payment' ? 'payment' : 'purchase'
    }
}

const PAYMENT_METHODS = [
    { key: 'cash', label: 'Naqd' },
    { key: 'card', label: 'Plastik' },
    { key: 'transfer', label: 'O\'tkazma' }
]

const paymentMethodLabel = (k) => PAYMENT_METHODS.find(p => p.key === k)?.label || 'Naqd'

export default function SupplierDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const sid = useMemo(() => parseInt(id) || id, [id])

    const [supplier, setSupplier] = useState(null)
    const [purchases, setPurchases] = useState([])
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [historyTab, setHistoryTab] = useState('all') // 'all' | 'purchases' | 'payments'
    const [showOptionsDrawer, setShowOptionsDrawer] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // === NEW: Purchase Drawer state ===
    const [showPurchaseDrawer, setShowPurchaseDrawer] = useState(false)
    const [purchaseSubmitting, setPurchaseSubmitting] = useState(false)
    const [purchaseForm, setPurchaseForm] = useState({
        amountDisplay: '',
        date: todayYmd(),
        reference: '',
        description: '',
        errors: {}
    })

    // === NEW: Payment Drawer state ===
    const [showPaymentDrawer, setShowPaymentDrawer] = useState(false)
    const [paymentSubmitting, setPaymentSubmitting] = useState(false)
    const [paymentForm, setPaymentForm] = useState({
        amountDisplay: '',
        paid_at: todayYmd(),
        payment_method: 'cash',
        description: '',
        errors: {}
    })

    // === NEW: Movement options + delete per-item ===
    const [selectedMovement, setSelectedMovement] = useState(null)
    const [showHistoryOptions, setShowHistoryOptions] = useState(false)
    const [showMovementDelete, setShowMovementDelete] = useState(false)
    const [movementDeleteSubmitting, setMovementDeleteSubmitting] = useState(false)
    const [movementCancelError, setMovementCancelError] = useState(null)

    /* ==========================================================
       DATA LOAD: ta'minotchi + uning tranzaksiyalari (GET /suppliers/{id}/transactions)
       ========================================================== */
    useEffect(() => { loadData() }, [id])

    const loadData = async () => {
        setLoading(true)
        try {
            const [supplierRaw, txs] = await Promise.all([
                suppliersApi.getSupplier(id),
                suppliersApi.getTransactions(id)
            ])
            setSupplier(normalizeSupplier(supplierRaw))
            applyTransactions(txs)
        } catch (err) {
            console.error('Failed to load supplier:', err)
            if (err.response?.status === 404) navigate('/suppliers')
        } finally {
            setLoading(false)
        }
    }

    // Bekor qilinganlar ro'yxatda ko'rsatilmaydi (server ham hisobga olmaydi)
    const applyTransactions = (txs) => {
        const active = (txs || []).filter(t => t.status !== 'canceled').map(normalizeMovement)
        setPurchases(active.filter(t => t._kind === 'purchase'))
        setPayments(active.filter(t => t._kind === 'payment'))
    }

    // Tranzaksiyadan keyin: server hisoblagan qarz va yangi ro'yxat
    const refreshAfterChange = async () => {
        try {
            const [supplierRaw, txs] = await Promise.all([
                suppliersApi.getSupplier(id),
                suppliersApi.getTransactions(id)
            ])
            setSupplier(normalizeSupplier(supplierRaw))
            applyTransactions(txs)
        } catch (err) {
            console.error('Refresh failed:', err)
        }
    }

    /* ==========================================================
       Supplier CRUD helpers (existing, preserved)
       ========================================================== */
    const handleUpdateSupplier = async (formData) => {
        try {
            const updated = await suppliersApi.updateSupplier(id, formData)
            const normalized = normalizeSupplier({ ...supplier, ...updated, ...formData, id: supplier?.id || id })
            setSupplier(normalized)
            setShowEditModal(false)
            toast.success("Ta'minotchi muvaffaqiyatli tahrirlandi")
            try { loadData() } catch {}
        } catch (err) {
            console.error('Update failed:', err)
            throw err
        }
    }

    const handleDelete = async () => {
        setSubmitting(true)
        try {
            await suppliersApi.deleteSupplier(id)
            toast.success("Ta'minotchi o'chirildi")
            navigate('/suppliers')
        } catch (err) {
            console.error('Delete failed:', err)
        } finally {
            setSubmitting(false)
            setShowDeleteConfirm(false)
        }
    }

    /* ==========================================================
       PURCHASE FORM SUBMIT + VALIDATION
       ========================================================== */
    const openPurchaseCreate = () => {
        setPurchaseForm({
            amountDisplay: '',
            date: todayYmd(),
            reference: '',
            description: '',
            errors: {}
        })
        setShowPurchaseDrawer(true)
    }
    const handleSubmitPurchase = async () => {
        const errors = {}
        const amount = parseCurrency(purchaseForm.amountDisplay)
        if (!amount || amount <= 0) errors.amount = 'Summa kiritilishi shart'
        if (amount > 99999999999) errors.amount = 'Summa 99 999 999 999 dan oshmasligi kerak'
        if (!purchaseForm.date) errors.date = 'Sana kiritilishi shart'
        setPurchaseForm(p => ({ ...p, errors }))
        if (Object.keys(errors).length > 0) return

        setPurchaseSubmitting(true)
        try {
            // Backendda INV raqami uchun alohida maydon yo'q: izohga qo'shiladi
            const description = [
                purchaseForm.reference.trim() ? `INV ${purchaseForm.reference.trim()}` : '',
                purchaseForm.description.trim()
            ].filter(Boolean).join(' · ')
            await suppliersApi.createDebt(sid, {
                amount,
                transaction_date: purchaseForm.date,
                description: description || null
            })
            toast.success("Yangi xarid saqlandi")
            setShowPurchaseDrawer(false)
            await refreshAfterChange()
        } catch (err) {
            if (err?.response?.status === 422) {
                const srv = err?.response?.data?.errors || {}
                const first = (v) => (Array.isArray(v) ? v[0] : v)
                setPurchaseForm(p => ({
                    ...p,
                    errors: {
                        ...p.errors,
                        ...(srv.amount ? { amount: first(srv.amount) } : {}),
                        ...(srv.transaction_date ? { date: first(srv.transaction_date) } : {}),
                        ...(srv.description ? { description: first(srv.description) } : {}),
                        ...(!Object.keys(srv).length && err.response.data?.message ? { amount: err.response.data.message } : {})
                    }
                }))
            } else {
                toast.error(err?.response?.data?.message || 'Xatolik yuz berdi')
            }
            console.error('Purchase submit failed:', err)
        } finally {
            setPurchaseSubmitting(false)
        }
    }

    /* ==========================================================
       PAYMENT FORM SUBMIT + VALIDATION + ALLOCATION PREVIEW
       ========================================================== */
    // Qarzdorlik serverda hisoblanadi (bekor qilinganlar hisobga kirmaydi)
    const totalBought = Number(supplier?.total_bought) || 0
    const totalPaid = Number(supplier?.total_paid) || 0
    const computedBalance = Number(supplier?.current_debt) || 0
    const hasDebt = computedBalance > 0
    const hasCredit = computedBalance < 0
    const absBalance = Math.abs(computedBalance)

    const openPaymentCreate = () => {
        setPaymentForm({
            amountDisplay: '',
            paid_at: todayYmd(),
            payment_method: 'cash',
            description: '',
            errors: {}
        })
        setShowPaymentDrawer(true)
    }
    // Taqsimlanish ko'rinishi: server kabi FIFO — eng eski ochiq xariddan boshlab
    const allocationPreview = useMemo(() => {
        const amount = parseCurrency(paymentForm.amountDisplay)
        if (amount <= 0) return []
        const open = purchases
            .filter(p => p.remaining_amount > 0)
            .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date) || (a.id - b.id))
        const rows = []
        let remain = amount
        for (const purch of open) {
            if (remain <= 0) break
            const allocated = Math.min(purch.remaining_amount, remain)
            rows.push({ id: purch.id, purchase: purch, allocated, type: 'purchase' })
            remain -= allocated
        }
        if (remain > 0) rows.push({ id: 'over', purchase: null, allocated: remain, type: 'over' })
        return rows
    }, [paymentForm.amountDisplay, purchases])

    const handleSubmitPayment = async () => {
        const errors = {}
        const amount = parseCurrency(paymentForm.amountDisplay)
        if (!amount || amount <= 0) errors.amount = 'Summa kiritilishi shart'
        // Ortiqcha to'lovni server tekshiradi (422 xabari maydon ostida chiqadi): mahalliy balans eskirgan bo'lishi mumkin
        if (!paymentForm.paid_at) errors.paid_at = 'Sana kiritilishi shart'
        setPaymentForm(p => ({ ...p, errors }))
        if (Object.keys(errors).length > 0) return

        setPaymentSubmitting(true)
        try {
            // To'lov turi uchun backend maydoni yo'q: naqd bo'lmasa izohga qo'shiladi
            const description = [
                paymentForm.payment_method !== 'cash' ? paymentMethodLabel(paymentForm.payment_method) : '',
                paymentForm.description.trim()
            ].filter(Boolean).join(' · ')
            // Bitta so'rov: server FIFO bo'yicha o'zi taqsimlaydi
            await suppliersApi.createPayment(sid, {
                amount,
                transaction_date: paymentForm.paid_at,
                description: description || null
            })
            toast.success("To'lov muvaffaqiyatli qo'shildi")
            setShowPaymentDrawer(false)
            await refreshAfterChange()
        } catch (err) {
            if (err?.response?.status === 422) {
                const data = err.response.data || {}
                const srv = data.errors || {}
                const first = (v) => (Array.isArray(v) ? v[0] : v)
                setPaymentForm(p => ({
                    ...p,
                    errors: {
                        ...p.errors,
                        amount: srv.amount ? first(srv.amount) : (srv.transaction_date ? undefined : data.message),
                        ...(srv.transaction_date ? { paid_at: first(srv.transaction_date) } : {})
                    }
                }))
            } else {
                toast.error(err?.response?.data?.message || 'Xatolik yuz berdi')
            }
            console.error('Payment submit failed:', err)
        } finally {
            setPaymentSubmitting(false)
        }
    }

    /* ==========================================================
       PER-ITEM HISTORY OPTIONS: Edit / Delete
       ========================================================== */
    // Backendda tahrirlash yo'q: tranzaksiya bekor qilinadi (PATCH .../cancel), qarz qayta hisoblanadi
    const handleDeleteMovement = async () => {
        if (!selectedMovement) return
        setMovementDeleteSubmitting(true)
        setMovementCancelError(null)
        try {
            await suppliersApi.cancelTransaction(selectedMovement.id)
            toast.success(selectedMovement._kind === 'purchase' ? "Xarid bekor qilindi" : "To'lov bekor qilindi")
            setShowMovementDelete(false)
            await refreshAfterChange()
        } catch (err) {
            const status = err?.response?.status
            // 422: xaridga to'langan pul qolgan xaridlardan oshib ketadi — server sababini oynada ko'rsatamiz
            const message = status === 403
                ? "Bekor qilishga ruxsat yo'q (faqat do'kon egasi)"
                : (err?.response?.data?.message || 'Xatolik yuz berdi')
            setMovementCancelError(message)
            toast.error(message, { duration: 6000 })
            console.error('Movement cancel failed:', err)
        } finally {
            setMovementDeleteSubmitting(false)
        }
    }

    /* ==========================================================
       UTILITIES
       ========================================================== */
    const handleCall = () => { if (supplier?.phone) window.location.href = `tel:${supplier.phone}` }
    const handleMessage = () => { if (supplier?.phone) window.location.href = `sms:${supplier.phone}` }

    const formatPhone = (phone) => {
        if (!phone) return ''
        const cleaned = phone.replace(/\D/g, '')
        if (cleaned.length === 12) {
            return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10, 12)}`
        }
        return phone
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
    const formatDateShort = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const yyyy = date.getFullYear()
        return `${mm}/${dd}/${yyyy}`
    }

    const allMovements = useMemo(() => {
        const merged = [
            ...purchases.map(p => ({ ...p, _kind: 'purchase' })),
            ...payments.map(p => ({ ...p, _kind: 'payment' }))
        ]
        merged.sort((a, b) => {
            const ta = a.date?.getTime?.() || new Date(a.created_at).getTime()
            const tb = b.date?.getTime?.() || new Date(b.created_at).getTime()
            return tb - ta
        })
        return merged
    }, [purchases, payments])

    if (loading && !supplier) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        )
    }
    if (!supplier) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
                <AlertCircle size={48} className="text-gray-400" />
                <p className="text-gray-500">Ta'minotchi topilmadi</p>
                <button onClick={() => navigate('/suppliers')} className="btn btn-primary">Orqaga</button>
            </div>
        )
    }

    const isMovementPurchase = (m) => {
        if (m._kind === 'purchase') return true
        if (m._kind === 'payment') return false
        return purchases.some(x => String(x.id) === String(m.id))
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-24 md:pb-8 md:pt-4 lg:pt-6 transition-colors overflow-x-hidden">
            {/* Kompyuterda ikki ustun: chapda ta'minotchi kartasi va amallar, o'ngda operatsiyalar */}
            <div className="md:px-2 lg:grid lg:grid-cols-[24rem_minmax(0,1fr)] xl:grid-cols-[26rem_minmax(0,1fr)] lg:items-start">
                <div className="lg:sticky lg:top-6">
                    {/* === HERO CARD (unchanged, already optimized) === */}
                    <div className="px-4 mt-2">
                        <div className="bg-white dark:bg-gray-800 pt-2 pb-3.5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 transition-all">
                            <div className="flex items-center justify-between px-4 py-0.5 mb-1">
                                <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center active:scale-90 transition-transform">
                                    <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
                                </button>
                                <button onClick={() => setShowOptionsDrawer(true)} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center active:scale-90 transition-transform">
                                    <MoreVertical size={18} className="text-gray-600 dark:text-gray-300" />
                                </button>
                            </div>

                            <div className="grid grid-cols-5 gap-3 px-4 pt-1">
                                <div className="col-span-3 flex items-start gap-2.5 min-w-0">
                                    <div className="w-14 h-14 bg-gradient-to-tr from-orange-100 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-600 dark:text-orange-400 rounded-[20px] flex items-center justify-center shadow-inner flex-shrink-0">
                                        <Building2 size={26} />
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5 text-left">
                                        <h1 className="text-[16.5px] font-bold text-gray-900 dark:text-white mb-0.5 leading-tight truncate">{supplier.name}</h1>
                                        {supplier.company_name && supplier.company_name !== supplier.name && (
                                            <p className="text-gray-400 dark:text-gray-500 text-[12px] font-medium mb-0.5 truncate">{supplier.company_name}</p>
                                        )}
                                        <p className="text-gray-400 dark:text-gray-500 text-[12px] font-semibold">{supplier.phone ? formatPhone(supplier.phone) : ''}</p>
                                    </div>
                                </div>
                                <div className="col-span-2 flex flex-col items-end justify-center text-right min-w-0">
                                    <div className={`text-[20px] font-extrabold tracking-tight leading-none mb-1 ${
                                        hasDebt ? 'text-red-500' : hasCredit ? 'text-emerald-500' : 'text-gray-600 dark:text-gray-300'
                                    }`}>
                                        {formatCurrency(absBalance)}<span className="text-[11px] font-bold opacity-70 ml-0.5">so'm</span>
                                    </div>
                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${
                                        hasDebt
                                            ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-900/30'
                                            : hasCredit
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 border border-emerald-100 dark:border-emerald-900/30'
                                                : 'bg-gray-100 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50'
                                    }`}>
                                        {hasDebt ? 'QARZ' : hasCredit ? 'BIZGA QARZ' : 'BALANS NOL'}
                                    </div>
                                </div>
                            </div>

                            {(supplier.contact_person || supplier.inn || supplier.address || supplier.note || supplier.created_at) && (
                                <div className="px-4 pt-3 mt-2.5 border-t border-gray-100 dark:border-gray-700/50">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">
                                        {supplier.contact_person && (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-6 h-6 rounded-lg bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center flex-shrink-0"><User size={12} className="text-gray-500" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-0.5">Mas'ul</p>
                                                    <p className="text-[12px] font-semibold text-gray-900 dark:text-white leading-tight truncate">{supplier.contact_person}</p>
                                                </div>
                                            </div>
                                        )}
                                        {supplier.inn && (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-6 h-6 rounded-lg bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center flex-shrink-0"><Hash size={12} className="text-gray-500" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-0.5">INN</p>
                                                    <p className="text-[12px] font-semibold text-gray-900 dark:text-white leading-tight font-mono truncate">{supplier.inn}</p>
                                                </div>
                                            </div>
                                        )}
                                        {supplier.created_at && (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <div className="w-6 h-6 rounded-lg bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center flex-shrink-0"><RefreshCw size={12} className="text-gray-500" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-0.5">Sana</p>
                                                    <p className="text-[12px] font-semibold text-gray-900 dark:text-white leading-tight truncate">{formatDateShort(supplier.created_at)}</p>
                                                </div>
                                            </div>
                                        )}
                                        {supplier.address && (
                                            <div className="flex items-start gap-1.5 min-w-0 sm:col-span-2">
                                                <div className="w-6 h-6 rounded-lg bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center flex-shrink-0 mt-0.5"><MapPin size={12} className="text-gray-500" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-0.5">Manzil</p>
                                                    <p className="text-[12px] font-semibold text-gray-900 dark:text-white leading-snug">{supplier.address}</p>
                                                </div>
                                            </div>
                                        )}
                                        {supplier.note && (
                                            <div className={`flex items-start gap-1.5 min-w-0 ${supplier.address ? 'sm:col-span-1' : 'col-span-2 sm:col-span-3'}`}>
                                                <div className="w-6 h-6 rounded-lg bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center flex-shrink-0 mt-0.5"><FileText size={12} className="text-gray-500" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-0.5">Izoh</p>
                                                    <p className="text-[12px] font-semibold text-gray-900 dark:text-white leading-snug">{supplier.note}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* === STATS === */}
                    <div className="px-4 mt-2.5">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center"><ShoppingCart size={12} className="text-blue-500" /></div>
                                </div>
                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Jami xarid</p>
                                <p className="text-[13px] font-black text-gray-900 dark:text-white leading-tight truncate">{formatCurrency(totalBought)}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">so'm</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center"><CheckCircle2 size={12} className="text-emerald-500" /></div>
                                </div>
                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Jami to'lov</p>
                                <p className="text-[13px] font-black text-gray-900 dark:text-white leading-tight truncate">{formatCurrency(totalPaid)}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">so'm</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                <div className="flex items-center justify-between mb-1">
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${hasDebt ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
                                        {hasDebt ? <TrendingUp size={12} className="text-red-500" /> : hasCredit ? <TrendingDown size={12} className="text-emerald-500" /> : <Wallet size={12} className="text-gray-400" />}
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Farq</p>
                                <p className={`text-[13px] font-black leading-tight truncate ${hasDebt ? 'text-red-500' : hasCredit ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(absBalance)}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">so'm</p>
                            </div>
                        </div>
                    </div>

                    {/* === TASK 3: ACTION BUTTONS — XARID QO'SHISH + TO'LOV QILISH (NEW) === */}
                    <div className="px-4 mt-2.5">
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={openPurchaseCreate} className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-[13px] shadow-lg shadow-blue-500/15 active:scale-[0.98] transition-all">
                                <Plus size={15} />
                                <ShoppingCart size={15} />
                                Xarid qo'shish
                            </button>
                            <button onClick={openPaymentCreate} className="flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[13px] shadow-lg shadow-emerald-500/15 active:scale-[0.98] transition-all">
                                <Plus size={15} />
                                <Wallet size={15} />
                                To'lov qilish
                            </button>
                        </div>
                    </div>

                    {/* === CALL + SMS (existing, preserved) === */}
                    <div className="px-4 mt-2">
                        <div className="flex gap-2">
                            <button onClick={handleCall} disabled={!supplier.phone} className="btn btn-outline flex-1 py-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 disabled:opacity-40 text-[12.5px]">
                                <PhoneIcon size={15} />Qo'ng'iroq
                            </button>
                            <button onClick={handleMessage} disabled={!supplier.phone} className="btn btn-outline flex-1 py-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 disabled:opacity-40 text-[12.5px]">
                                <MessageSquare size={15} />Xabar
                            </button>
                        </div>
                    </div>
                </div>

                {/* === OPERATSIYALAR TARIXI === */}
                <div className="px-4 mt-3.5 lg:mt-2">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">Operatsiyalar tarixi</h2>
                        <span className="text-[12px] text-gray-400">
                            {historyTab === 'all' ? `${allMovements.length} ta`
                                : historyTab === 'purchases' ? `${purchases.length} ta xarid`
                                    : `${payments.length} ta to'lov`}
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-3">
                        <button type="button" onClick={() => setHistoryTab('all')} className={`py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                            historyTab === 'all' ? 'bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                        }`}><ArrowRightLeft size={11} className="inline mr-1 -mt-0.5" />Hammasi</button>
                        <button type="button" onClick={() => setHistoryTab('purchases')} className={`py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                            historyTab === 'purchases' ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                        }`}><ShoppingCart size={11} className="inline mr-1 -mt-0.5" />Xaridlar</button>
                        <button type="button" onClick={() => setHistoryTab('payments')} className={`py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                            historyTab === 'payments' ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                        }`}><CreditCard size={11} className="inline mr-1 -mt-0.5" />To'lovlar</button>
                    </div>

                    {/* === ALL TAB === */}
                    {historyTab === 'all' && (
                        <>
                            {allMovements.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center"><ArrowRightLeft size={20} className="text-gray-400" /></div>
                                    <div className="text-gray-400">Hali operatsiyalar yo'q</div>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {allMovements.map(mov => {
                                        const isPurchase = isMovementPurchase(mov)
                                        const amt = parseFloat(mov.amount || mov.total_amount) || 0
                                        return (
                                            <div key={mov.id} className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm flex items-center gap-3">
                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                                    isPurchase ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'
                                                }`}>
                                                    {isPurchase ? <ShoppingCart size={19} className="text-blue-500" /> : <CheckCircle2 size={19} className="text-emerald-500" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                                                            isPurchase
                                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100/60 dark:border-blue-900/30'
                                                                : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/30'
                                                        }`}>{isPurchase ? 'Xarid' : "To'lov"}</span>
                                                        {mov.reference && <span className="text-[11px] text-gray-400">• {mov.reference}</span>}
                                                    </div>
                                                    {mov.description && <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-0.5 line-clamp-1">{mov.description}</p>}
                                                    <p className="text-[12px] text-gray-400">
                                                        {formatDateShort(mov.date)}
                                                        {mov.items_count && ` • ${mov.items_count} ta tovar`}
                                                        {mov.payment_method && ` • ${paymentMethodLabel(mov.payment_method)}`}
                                                    </p>
                                                </div>
                                                <div className="text-right flex-shrink-0 pl-1">
                                                    <p className={`text-[15px] font-extrabold leading-none mb-0.5 ${isPurchase ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                        {isPurchase ? '+' : '-'}{formatCurrency(amt)}
                                                    </p>
                                                    <p className="text-[12px] text-gray-400 font-normal">so'm</p>
                                                </div>
                                                <button onClick={() => { setSelectedMovement({ ...mov, _kind: isPurchase ? 'purchase' : 'payment' }); setShowHistoryOptions(true) }} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform ml-1">
                                                    <MoreVertical size={16} className="text-gray-500" />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* === PURCHASES TAB === */}
                    {historyTab === 'purchases' && (
                        <>
                            {purchases.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center"><ShoppingCart size={20} className="text-gray-400" /></div>
                                    <div className="text-gray-400">Hali xaridlar yo'q</div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {purchases.map(pur => {
                                        const amt = parseFloat(pur.amount || pur.total_amount) || 0
                                        return (
                                            <div key={pur.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[12px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100/60 dark:border-blue-900/30">
                                                            Xarid
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="text-right mr-1">
                                                            <div className="text-[12px] text-gray-400">{formatDateShort(pur.date)}</div>
                                                            {pur.reference && <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono">{pur.reference}</div>}
                                                        </div>
                                                        <button onClick={() => { setSelectedMovement({ ...pur, _kind: 'purchase' }); setShowHistoryOptions(true) }} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center active:scale-90 transition-transform">
                                                            <MoreVertical size={15} className="text-gray-500" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mb-3">
                                                    <p className="text-[12px] text-gray-400 uppercase tracking-wider mb-1">Summasi</p>
                                                    <p className="text-[18px] font-black text-blue-600 dark:text-blue-400">
                                                        +{formatCurrency(amt)} <span className="text-[12px] font-normal opacity-60">so'm</span>
                                                    </p>
                                                    {pur.remaining_amount > 0 && pur.remaining_amount < amt && (
                                                        <p className="text-[12px] text-gray-500 mt-0.5">Qoldiq: {formatCurrency(pur.remaining_amount)} so'm</p>
                                                    )}
                                                    {pur.status === 'closed' && <p className="text-[12px] text-emerald-600 mt-0.5">To'liq to'langan</p>}
                                                    {pur.is_overdue && <p className="text-[12px] text-red-500 mt-0.5">Muddati o'tgan</p>}
                                                </div>
                                                {pur.description && (
                                                    <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                                                        <FileText size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-tight">{pur.description}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* === PAYMENTS TAB === */}
                    {historyTab === 'payments' && (
                        <>
                            {payments.length === 0 ? (
                                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center"><CreditCard size={20} className="text-gray-400" /></div>
                                    <div className="text-gray-400">Hali to'lovlar yo'q</div>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {payments.map(pay => {
                                        const amt = parseFloat(pay.amount) || 0
                                        return (
                                            <div key={pay.id} className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 bg-emerald-50 dark:bg-emerald-900/20">
                                                    <CheckCircle2 size={19} className="text-emerald-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/30">
                                                            To'lov
                                                        </span>
                                                        {pay.payment_method && <span className="text-[11px] text-gray-400">• {paymentMethodLabel(pay.payment_method)}</span>}
                                                    </div>
                                                    {pay.description && <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-0.5 line-clamp-1">{pay.description}</p>}
                                                    <p className="text-[12px] text-gray-400">{formatDateShort(pay.date)}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0 pl-1">
                                                    <p className="text-[15px] font-extrabold text-emerald-600 dark:text-emerald-400 leading-none mb-0.5">-{formatCurrency(amt)}</p>
                                                    <p className="text-[12px] text-gray-400 font-normal">so'm</p>
                                                </div>
                                                <button onClick={() => { setSelectedMovement({ ...pay, _kind: 'payment' }); setShowHistoryOptions(true) }} className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700/30 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform ml-1">
                                                    <MoreVertical size={16} className="text-gray-500" />
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ==================================================================
                EXISTING DRAWERS (preserved structure, Customer style)
               ================================================================== */}
            <Drawer.Root open={showOptionsDrawer} onOpenChange={setShowOptionsDrawer} direction="bottom">
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl outline-none overflow-y-auto max-h-[85vh]">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="overflow-y-auto max-h-[calc(85vh-80px)] px-4 pb-8">
                                <div className="space-y-1.5 pb-4">
                                    <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-4 px-1">Amallar</h3>
                                    <button onClick={() => { setShowOptionsDrawer(false); setShowEditModal(true) }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:bg-gray-50 dark:active:bg-gray-700/30 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center"><Edit2 size={18} className="text-blue-500" /></div>
                                        <div className="flex-1 text-left"><p className="text-[14px] font-bold text-gray-900 dark:text-white">Tahrirlash</p></div>
                                    </button>
                                    <button onClick={() => { setShowOptionsDrawer(false); setShowDeleteConfirm(true) }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:bg-gray-50 dark:active:bg-gray-700/30 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center"><Trash2 size={18} className="text-red-500" /></div>
                                        <div className="flex-1 text-left"><p className="text-[14px] font-bold text-red-500">O'chirish</p></div>
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-3" />
                                    <button onClick={() => setShowOptionsDrawer(false)} className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:bg-gray-50 dark:active:bg-gray-700/30 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center"><X size={18} className="text-gray-500" /></div>
                                        <div className="flex-1 text-left"><p className="text-[14px] font-bold text-gray-900 dark:text-white">Yopish</p></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            <Drawer.Root open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} direction="bottom">
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl outline-none overflow-y-auto max-h-[85vh]">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="overflow-y-auto max-h-[calc(85vh-80px)] px-4 pb-8">
                                <div className="flex flex-col items-center text-center mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4"><AlertCircle size={30} className="text-red-500" /></div>
                                    <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-2">O'chirishni tasdiqlang</h3>
                                    <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-[280px]">Ushbu ta'minotchini o'chirib tashlamoqchimisiz? Bu amal qaytarilmaydi.</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setShowDeleteConfirm(false)} disabled={submitting} className="py-3.5 rounded-2xl font-bold text-[15px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 active:scale-95 transition-all disabled:opacity-50">Bekor qilish</button>
                                    <button onClick={handleDelete} disabled={submitting} className="py-3.5 rounded-2xl font-bold text-[15px] bg-red-500 text-white active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20 flex items-center justify-center gap-2">
                                        {submitting ? <Loader2 size={18} className="animate-spin" /> : null}O'chirish
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            <SupplierModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} onSave={handleUpdateSupplier} supplier={supplier} />

            {/* ==================================================================
                NEW DRAWERS — Task 4 + 5 + 6
               ================================================================== */}
            {/* ============ PURCHASE DRAWER (Create + Edit, Validation, Submit) ============ */}
            <Drawer.Root open={showPurchaseDrawer} onOpenChange={(v) => { if (!purchaseSubmitting) setShowPurchaseDrawer(v) }} direction="bottom">
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl outline-none overflow-y-auto max-h-[90vh]">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-4 pb-8">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[18px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center"><Receipt size={18} className="text-blue-500" /></div>
                                    Yangi xarid qo'shish
                                </h3>
                                <button onClick={() => setShowPurchaseDrawer(false)} disabled={purchaseSubmitting} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700/40 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50">
                                    <X size={16} className="text-gray-500" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[12px] text-gray-400 uppercase font-bold tracking-wider mb-1.5 px-0.5">Summa <span className="text-red-400">*</span></label>
                                    <div className={`relative flex items-center rounded-2xl border transition-colors ${
                                        purchaseForm.errors.amount ? 'border-red-400 bg-red-50/50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 focus-within:border-blue-400'
                                    }`}>
                                        <BadgeDollarSign size={18} className="ml-3.5 text-gray-400" />
                                        <input
                                            type="text" inputMode="decimal" autoComplete="off"
                                            className="flex-1 bg-transparent outline-none py-3.5 px-3 text-[16px] font-bold text-gray-900 dark:text-white placeholder-gray-400"
                                            placeholder="0"
                                            value={purchaseForm.amountDisplay}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/[^\d]/g, '')
                                                const formatted = digits ? formatCurrency(digits) : ''
                                                setPurchaseForm(p => ({ ...p, amountDisplay: formatted, errors: { ...p.errors, amount: undefined } }))
                                            }}
                                        />
                                        <span className="mr-3.5 text-[12px] font-bold text-gray-400">so'm</span>
                                    </div>
                                    {purchaseForm.errors.amount && <p className="text-[12px] text-red-500 mt-1.5 px-0.5">{purchaseForm.errors.amount}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[12px] text-gray-400 uppercase font-bold tracking-wider mb-1.5 px-0.5">Sana <span className="text-red-400">*</span></label>
                                        <div className={`flex items-center rounded-2xl border transition-colors ${
                                            purchaseForm.errors.date ? 'border-red-400' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 focus-within:border-blue-400'
                                        }`}>
                                            <Calendar size={17} className="ml-3.5 text-gray-400" />
                                            <input type="date" max={todayYmd()}
                                                className="flex-1 bg-transparent outline-none py-3.5 px-3 text-[14px] font-semibold text-gray-900 dark:text-white"
                                                value={purchaseForm.date}
                                                onChange={(e) => setPurchaseForm(p => ({ ...p, date: e.target.value, errors: { ...p.errors, date: undefined } }))}
                                            />
                                        </div>
                                        {purchaseForm.errors.date && <p className="text-[12px] text-red-500 mt-1.5 px-0.5">{purchaseForm.errors.date}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[12px] text-gray-400 uppercase font-bold tracking-wider mb-1.5 px-0.5">INV / Hujjat raqami</label>
                                        <div className="flex items-center rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 focus-within:border-blue-400 transition-colors">
                                            <FileText size={17} className="ml-3.5 text-gray-400" />
                                            <input type="text" className="flex-1 bg-transparent outline-none py-3.5 px-3 text-[14px] font-semibold text-gray-900 dark:text-white placeholder-gray-400"
                                                placeholder="INV-0001"
                                                value={purchaseForm.reference}
                                                onChange={(e) => setPurchaseForm(p => ({ ...p, reference: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[12px] text-gray-400 uppercase font-bold tracking-wider mb-1.5 px-0.5">Izoh</label>
                                    <textarea rows={3} className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 focus-within:border-blue-400 transition-colors outline-none py-3 px-3.5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                                        placeholder="Maxsulotlar tavsifi, qisqa izoh..."
                                        value={purchaseForm.description}
                                        onChange={(e) => setPurchaseForm(p => ({ ...p, description: e.target.value }))}
                                    />
                                </div>
                                <div className="pt-2 grid grid-cols-2 gap-3">
                                    <button onClick={() => setShowPurchaseDrawer(false)} disabled={purchaseSubmitting} className="py-3.5 rounded-2xl font-bold text-[14.5px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 active:scale-95 transition-all disabled:opacity-50">Bekor qilish</button>
                                    <button onClick={async () => { try { await handleSubmitPurchase() } catch {} }}
                                        disabled={purchaseSubmitting || !parseCurrency(purchaseForm.amountDisplay)}
                                        className="py-3.5 rounded-2xl font-bold text-[14.5px] bg-blue-500 hover:bg-blue-600 text-white active:scale-95 transition-all disabled:opacity-50 disabled:hover:bg-blue-500 shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2"
                                    >
                                        {purchaseSubmitting ? <Loader2 size={17} className="animate-spin" /> : <ShoppingCart size={17} />}
                                        Xaridni qo'shish
                                    </button>
                                </div>
                            </div>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* ============ PAYMENT DRAWER ============ */}
            <Drawer.Root open={showPaymentDrawer} onOpenChange={(v) => { if (!paymentSubmitting) setShowPaymentDrawer(v) }} direction="bottom">
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl outline-none overflow-y-auto max-h-[90vh]">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="overflow-y-auto max-h-[calc(90vh-80px)] px-4 pb-8">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[18px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center"><Wallet size={18} className="text-emerald-500" /></div>
                                    To'lov qilish
                                </h3>
                                <button onClick={() => setShowPaymentDrawer(false)} disabled={paymentSubmitting} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700/40 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50">
                                    <X size={16} className="text-gray-500" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                                        <label className="text-[12px] text-gray-400 uppercase font-bold tracking-wider">Summa <span className="text-red-400">*</span></label>
                                        {computedBalance > 0 && (
                                            <button type="button" onClick={() => setPaymentForm(p => ({ ...p, amountDisplay: formatCurrency(computedBalance), errors: { ...p.errors, amount: undefined } }))}
                                                className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider active:scale-95 transition-transform"
                                            >• To'liq ({formatCurrency(Math.ceil(computedBalance))} so'm)</button>
                                        )}
                                    </div>
                                    <div className={`relative flex items-center rounded-2xl border transition-colors ${
                                        paymentForm.errors.amount ? 'border-red-400 bg-red-50/50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 focus-within:border-emerald-400'
                                    }`}>
                                        <BadgeDollarSign size={18} className="ml-3.5 text-gray-400" />
                                        <input
                                            type="text" inputMode="decimal" autoComplete="off"
                                            className="flex-1 bg-transparent outline-none py-3.5 px-3 text-[16px] font-bold text-gray-900 dark:text-white placeholder-gray-400"
                                            placeholder="0"
                                            value={paymentForm.amountDisplay}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/[^\d]/g, '')
                                                const formatted = digits ? formatCurrency(digits) : ''
                                                setPaymentForm(p => ({ ...p, amountDisplay: formatted, errors: { ...p.errors, amount: undefined } }))
                                            }}
                                        />
                                        <span className="mr-3.5 text-[12px] font-bold text-gray-400">so'm</span>
                                    </div>
                                    {paymentForm.errors.amount && <p className="text-[12px] text-red-500 mt-1.5 px-0.5">{paymentForm.errors.amount}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[12px] text-gray-400 uppercase font-bold tracking-wider mb-1.5 px-0.5">To'lov turi</label>
                                        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-gray-700/50">
                                            {PAYMENT_METHODS.map(m => (
                                                <button key={m.key} type="button" onClick={() => setPaymentForm(p => ({ ...p, payment_method: m.key }))}
                                                    className={`py-2 rounded-xl text-[12px] font-bold transition-all ${
                                                        paymentForm.payment_method === m.key
                                                            ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                                            : 'text-gray-500 dark:text-gray-400'
                                                    }`}
                                                >{m.label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[12px] text-gray-400 uppercase font-bold tracking-wider mb-1.5 px-0.5">Sana <span className="text-red-400">*</span></label>
                                        <div className={`flex items-center rounded-2xl border transition-colors ${
                                            paymentForm.errors.paid_at ? 'border-red-400' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 focus-within:border-emerald-400'
                                        }`}>
                                            <Calendar size={17} className="ml-3.5 text-gray-400" />
                                            <input type="date" max={todayYmd()}
                                                className="flex-1 bg-transparent outline-none py-3.5 px-3 text-[14px] font-semibold text-gray-900 dark:text-white"
                                                value={paymentForm.paid_at}
                                                onChange={(e) => setPaymentForm(p => ({ ...p, paid_at: e.target.value, errors: { ...p.errors, paid_at: undefined } }))}
                                            />
                                        </div>
                                        {paymentForm.errors.paid_at && <p className="text-[12px] text-red-500 mt-1.5 px-0.5">{paymentForm.errors.paid_at}</p>}
                                    </div>
                                </div>

                                {/* ALLOCATION PREVIEW */}
                                {allocationPreview.length > 0 && (
                                    <div className="rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/70 dark:bg-gray-700/20 p-3.5">
                                        <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 px-0.5 flex items-center gap-1.5"><ArrowRightLeft size={12} />Taqsimlanishi</h4>
                                        <div className="space-y-2">
                                            {allocationPreview.map((row, i) => (
                                                <div key={row.id + '-' + i} className="flex items-center justify-between gap-3 py-1">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        {row.type === 'purchase'
                                                            ? <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0"><ShoppingCart size={11} className="text-blue-500" /></div>
                                                            : <div className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0"><AlertCircle size={11} className="text-red-500" /></div>
                                                        }
                                                        <p className={`text-[12px] font-semibold truncate ${row.type === 'over' ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                                            {row.type === 'purchase'
                                                                ? `Xarid ${formatDateShort(row.purchase.date)}${row.purchase.description ? ` · ${row.purchase.description}` : ''}`
                                                                : "Ortiqcha — qabul qilinmaydi"}
                                                        </p>
                                                    </div>
                                                    <p className={`text-[12.5px] font-bold flex-shrink-0 ${row.type === 'over' ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(row.allocated)} so'm</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[12px] text-gray-400 uppercase font-bold tracking-wider mb-1.5 px-0.5">Izoh</label>
                                    <textarea rows={2} className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 focus-within:border-emerald-400 transition-colors outline-none py-3 px-3.5 text-[14px] text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                                        placeholder="To'lov haqida qisqacha ma'lumot..."
                                        value={paymentForm.description}
                                        onChange={(e) => setPaymentForm(p => ({ ...p, description: e.target.value }))}
                                    />
                                </div>

                                <div className="pt-1 grid grid-cols-2 gap-3">
                                    <button onClick={() => setShowPaymentDrawer(false)} disabled={paymentSubmitting} className="py-3.5 rounded-2xl font-bold text-[14.5px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 active:scale-95 transition-all disabled:opacity-50">Bekor qilish</button>
                                    <button onClick={async () => { try { await handleSubmitPayment() } catch {} }}
                                        disabled={paymentSubmitting || !parseCurrency(paymentForm.amountDisplay)}
                                        className="py-3.5 rounded-2xl font-bold text-[14.5px] bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 transition-all disabled:opacity-50 disabled:hover:bg-emerald-500 shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2"
                                    >
                                        {paymentSubmitting ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                                        To'lov qilish
                                    </button>
                                </div>
                            </div>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* ============ HISTORY ITEM OPTIONS DRAWER ============ */}
            <Drawer.Root open={showHistoryOptions} onOpenChange={setShowHistoryOptions} direction="bottom">
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl outline-none overflow-y-auto max-h-[80vh]">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="overflow-y-auto max-h-[calc(80vh-80px)] px-4 pb-8">
                                <div className="space-y-1 pb-4">
                                    <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-4 px-1">
                                        {selectedMovement?._kind === 'purchase' ? "Xarid amallari" : "To'lov amallari"}
                                    </h3>
                                    <button onClick={() => { setShowHistoryOptions(false); setMovementCancelError(null); setShowMovementDelete(true) }} className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:bg-gray-50 dark:active:bg-gray-700/30 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center"><Trash2 size={18} className="text-red-500" /></div>
                                        <div className="flex-1 text-left"><p className="text-[14px] font-bold text-red-500">Bekor qilish</p><p className="text-[12px] text-gray-400">Qarzdorlik qayta hisoblanadi</p></div>
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700 my-2.5" />
                                    <button onClick={() => setShowHistoryOptions(false)} className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:bg-gray-50 dark:active:bg-gray-700/30 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-700/40 flex items-center justify-center"><X size={18} className="text-gray-500" /></div>
                                        <div className="flex-1 text-left"><p className="text-[14px] font-bold text-gray-900 dark:text-white">Yopish</p></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* ============ HISTORY ITEM DELETE CONFIRM ============ */}
            <Drawer.Root open={showMovementDelete} onOpenChange={setShowMovementDelete} direction="bottom">
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 rounded-t-3xl outline-none overflow-y-auto max-h-[85vh]">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="overflow-y-auto max-h-[calc(85vh-80px)] px-4 pb-8">
                                <div className="flex flex-col items-center text-center mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4"><AlertCircle size={30} className="text-red-500" /></div>
                                    <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-2">Bekor qilishni tasdiqlang</h3>
                                    <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed max-w-[320px]">
                                        Ushbu {selectedMovement?._kind === 'purchase' ? 'xarid' : "to'lov"} bekor qilinadi va ta'minotchi qarzdorligi qayta hisoblanadi. Bu amal qaytarilmaydi.
                                    </p>
                                    {movementCancelError && (
                                        <p className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-[13px] text-red-600 dark:text-red-300 leading-snug max-w-[320px]">
                                            {movementCancelError}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => setShowMovementDelete(false)} disabled={movementDeleteSubmitting} className="py-3.5 rounded-2xl font-bold text-[15px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 active:scale-95 transition-all disabled:opacity-50">Yopish</button>
                                    <button onClick={handleDeleteMovement} disabled={movementDeleteSubmitting} className="py-3.5 rounded-2xl font-bold text-[15px] bg-red-500 text-white active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20 flex items-center justify-center gap-2">
                                        {movementDeleteSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={17} />}
                                        Bekor qilish
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    )
}
