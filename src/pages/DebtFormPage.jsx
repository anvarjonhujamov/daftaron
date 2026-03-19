import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { debtsApi } from '../api/debts.api'
import { customersApi } from '../api/customers.api'
import { ArrowLeft } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatCurrency, parseCurrency } from '../utils/format'

const getToday = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const getMonthAgo = () => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
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
        send_sms: false
    })
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(false)
    const [loadingCustomers, setLoadingCustomers] = useState(true)
    const [error, setError] = useState('')

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

        try {
            await debtsApi.createDebt({
                customer_id: parseInt(form.customer_id),
                total_amount: parseCurrency(form.total_amount),
                description: form.description || null,
                debt_date: form.debt_date || null,
                send_sms: form.send_sms
            })

            if (preselectedCustomerId) {
                navigate(`/customers/${preselectedCustomerId}`)
            } else {
                navigate('/debts')
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Xatolik yuz berdi')
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

            <div className="card">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                        {error}
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
                            Sana tanlanmasa bugungi sana olinadi. Oxirgi 1 oy oralig'ida bo'lishi kerak.
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                        <div className="flex-1">
                            <label htmlFor="send_sms" className="text-[14px] font-bold text-gray-700 dark:text-gray-200 block">
                                Mijozga SMS yuborish
                            </label>
                            <p className="text-[11px] text-gray-400 opacity-80">
                                Tarifdagi bepul SMS limitidan keyin har bir SMS uchun balansdan yechiladi.
                            </p>
                        </div>
                        <button
                            id="send_sms"
                            type="button"
                            role="switch"
                            aria-checked={form.send_sms}
                            className="ios-switch"
                            data-state={form.send_sms ? 'checked' : 'unchecked'}
                            onClick={() => setForm({ ...form, send_sms: !form.send_sms })}
                        >
                            <span className="ios-switch-thumb" />
                        </button>
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
