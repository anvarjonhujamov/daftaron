import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { debtsApi } from '../api/debts.api'
import { customersApi } from '../api/customers.api'
import { ArrowLeft, CalendarDays, AlertTriangle, MessageSquareOff } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatCurrency, parseCurrency } from '../utils/format'
import { useSubscription } from '../contexts/SubscriptionContext'

const getToday = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const getMonthAgo = () => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const getMonthLater = () => {
    const d = new Date()
    d.setMonth(d.getMonth() + 3)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const getTomorrow = () => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DebtFormPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const preselectedCustomerId = searchParams.get('customer_id')

    const [form, setForm] = useState({
        customer_id: preselectedCustomerId || '',
        total_amount: '',
        description: '',
        debt_date: getToday(),
        return_date: '',
        send_sms: false
    })
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingCustomers, setLoadingCustomers] = useState(true)
    const [error, setError] = useState('')
    const { sms_remaining, status } = useSubscription()

    const isSmsLimitEmpty = useMemo(() => {
        if (sms_remaining == null) return false
        return Number(sms_remaining) <= 0
    }, [sms_remaining])

    // Agar user SMS yuborishni tanlagan bo'lsa va limiti 0 = in-line warning
    useEffect(() => {
        if (form.send_sms && isSmsLimitEmpty) {
            setError(
                "⚠️ SMS limiti tugagan. Mijozga SMS yuborib bo'lmaydi. Iltimos, SMS paketini sotib oling yoki \"Mijozga SMS yuborish\" funksiyasini o'chiring."
            )
        } else if (error && error.includes('SMS limiti')) {
            setError('')
        }
    }, [form.send_sms, isSmsLimitEmpty])

    useEffect(() => {
        loadCustomers()
    }, [])

    const loadCustomers = async () => {
        try {
            const data = await customersApi.getCustomers({ per_page: 100 })
            setCustomers(data.data || [])
        } catch (err) {
            console.error('Failed to load customers:', err)
        } finally {
            setLoadingCustomers(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Qaytarish sanasi nasiya sanasidan kichik bo'lmasligi kerak
        if (form.return_date && form.debt_date) {
            if (new Date(form.return_date) < new Date(form.debt_date)) {
                setError('Qaytarish sanasi nasiya sanasidan oldin bo\'lishi mumkin emas')
                setLoading(false)
                return
            }
        }

        // Agar SMS yuborishni tanlagan bo'lsa va limit 0, imkonini bermaymiz (inline warning + toast orqali bildirish)
        if (form.send_sms && isSmsLimitEmpty) {
            setError(
                "❌ SMS limiti tugagan. SMS yuborishni o'chirib yuboring yoki SMS paketini sotib oling."
            )
            setLoading(false)
            return
        }

        try {
            await debtsApi.createDebt({
                customer_id: parseInt(form.customer_id),
                total_amount: parseCurrency(form.total_amount),
                description: form.description || null,
                debt_date: form.debt_date || null,
                return_date: form.return_date || null,
                send_sms: form.send_sms
            })

            if (preselectedCustomerId) {
                navigate(`/customers/${preselectedCustomerId}`)
            } else {
                navigate('/debts')
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Xatolik yuz berdi'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="px-4 py-6">
            <div className="mb-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1 text-blue-500 text-sm font-medium active:opacity-60 transition-opacity"
                >
                    <ArrowLeft size={16} />
                    Orqaga
                </button>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-6">Yangi nasiya</h1>

            {/* SMS Limiti tugaganda avval darhol notification (foydalanuvchi oldidan) */}
            {isSmsLimitEmpty && status === 'active' && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 rounded-2xl text-sm flex items-start gap-3">
                    <MessageSquareOff size={20} className="text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold mb-0.5">SMS limiti tugagan</p>
                        <p className="opacity-80 text-[12.5px]">
                            Endi mijozlarga SMS yuborib bo'lmaydi. Yangi SMS paketini sotib oling to'liq ishlash uchun.
                        </p>
                        <Link to="/subscription" className="inline-block mt-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-bold rounded-xl">
                            SMS sotib olish
                        </Link>
                    </div>
                </div>
            )}

            <div className="card">
                {error && (
                    <div className={`mb-4 p-3 rounded-xl text-sm flex items-start gap-2 ${
                        error.includes('SMS')
                            ? 'bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/10 dark:border-amber-800/40 dark:text-amber-200'
                            : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                        {error.includes('SMS') ? <AlertTriangle size={16} className="shrink-0 mt-0.5" /> : null}
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Mijoz *</label>
                        {loadingCustomers ? (
                            <div className="input flex items-center justify-center">
                                <LoadingSpinner size="sm" />
                            </div>
                        ) : (
                            <select
                                className="input"
                                value={form.customer_id}
                                onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                                required
                            >
                                <option value="">Tanlang...</option>
                                {customers.map(customer => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name} ({customer.phone})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="label">Summa *</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            className="input"
                            placeholder="0"
                            value={form.total_amount}
                            onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '')
                                setForm({
                                    ...form,
                                    total_amount: digits ? formatCurrency(digits) : ''
                                })
                            }}
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Izoh</label>
                        <textarea
                            className="input min-h-[80px] resize-none"
                            placeholder="Nima uchun nasiya berildi..."
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="label">Nasiya sanasi</label>
                            <input
                                type="date"
                                className="input"
                                value={form.debt_date}
                                max={getToday()}
                                min={getMonthAgo()}
                                onChange={(e) => setForm({ ...form, debt_date: e.target.value })}
                            />
                            <p className="text-[12px] text-gray-400 mt-1">
                                Bo'sh qolsa bugungi sana olinadi. Oxirgi 1 oy ichida.
                            </p>
                        </div>
                        <div>
                            <label className="label flex items-center gap-1.5">
                                <CalendarDays size={13} className="text-indigo-500" />
                                Qaytarish sanasi
                            </label>
                            <input
                                type="date"
                                className="input border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                                value={form.return_date}
                                min={getTomorrow()}
                                max={getMonthLater()}
                                onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                            />
                            <p className="text-[12px] text-gray-400 mt-1">
                                Tanlansa, shu sanada mijozga avtomatik SMS yuboriladi.
                                1-90 kun oralig'ida bo'lishi kerak.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                        <div className="flex-1">
                            <label htmlFor="send_sms" className="text-[14px] font-bold text-gray-700 dark:text-gray-200 block">
                                Mijozga SMS yuborish
                            </label>
                            <p className="text-[11px] text-gray-400 opacity-80">
                                {sms_remaining != null
                                    ? (isSmsLimitEmpty
                                        ? <span className="text-amber-600 dark:text-amber-300 font-semibold">⚠️ SMS limiti tugagan</span>
                                        : `Qolgan SMS: ${sms_remaining} ta`)
                                    : 'Tarifdagi bepul SMS limitidan keyin har bir SMS uchun balansdan yechiladi.'}
                            </p>
                        </div>
                        <button
                            id="send_sms"
                            type="button"
                            role="switch"
                            aria-checked={form.send_sms}
                            className={`ios-switch ${isSmsLimitEmpty ? 'opacity-70' : ''}`}
                            data-state={form.send_sms ? 'checked' : 'unchecked'}
                            onClick={() => setForm({ ...form, send_sms: !form.send_sms })}
                        >
                            <span className="ios-switch-thumb" />
                        </button>
                    </div>
                    <div className={`p-3 rounded-2xl border ${
                        isSmsLimitEmpty
                            ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-800/30'
                            : 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-900/20'
                    }`}>
                        <p className={`text-[11px] uppercase font-bold tracking-wider mb-0.5 ${
                            isSmsLimitEmpty ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                            SMS Limiti
                        </p>
                        <p className={`text-[14px] font-bold ${
                            isSmsLimitEmpty ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                            {isSmsLimitEmpty ? 'Tugagan' : `${sms_remaining ?? 0} ta qoldi`}
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={loading}
                    >
                        {loading ? <LoadingSpinner size="sm" /> : 'Saqlash'}
                    </button>
                </form>
            </div>
        </div>
    )
}
