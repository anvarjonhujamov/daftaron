import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { debtsApi } from '../api/debts.api'
import { paymentsApi } from '../api/payments.api'
import {
    Clock, CheckCircle2, Trash2, Plus, ArrowLeft,
    FileText, CreditCard, Calendar, ChevronRight
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

export default function DebtDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [debt, setDebt] = useState(null)
    const [payments, setPayments] = useState([])
    const [loading, setLoading] = useState(true)
    const [showPaymentForm, setShowPaymentForm] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        loadData()
    }, [id])

    const loadData = async () => {
        try {
            const [debtData, paymentsData] = await Promise.all([
                debtsApi.getDebt(id),
                paymentsApi.getPayments({ debt_id: id })
            ])
            setDebt(debtData.data || debtData)
            setPayments(paymentsData.data || [])
        } catch (err) {
            console.error('Failed to load debt:', err)
            if (err.response?.status === 404) {
                navigate('/debts')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleAddPayment = async (e) => {
        e.preventDefault()
        if (!paymentAmount || isNaN(parseFloat(paymentAmount))) return

        setSubmitting(true)
        try {
            await paymentsApi.createPayment({
                debt_id: parseInt(id),
                amount: parseFloat(paymentAmount)
            })
            setPaymentAmount('')
            setShowPaymentForm(false)
            loadData()
        } catch (err) {
            alert(err.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSubmitting(false)
        }
    }

    const handleCloseDebt = async () => {
        if (!confirm('Bu nasiyani yopmoqchimisiz?')) return

        setSubmitting(true)
        try {
            await debtsApi.closeDebt(id)
            loadData()
        } catch (err) {
            alert(err.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteDebt = async () => {
        if (!confirm('Bu nasiyani o\'chirmoqchimisiz?')) return

        setSubmitting(true)
        try {
            await debtsApi.deleteDebt(id)
            navigate('/debts')
        } catch (err) {
            alert(err.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSubmitting(false)
        }
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('uz-UZ').format(amount || 0)
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        return new Date(dateString).toLocaleDateString('uz-UZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    if (!debt) {
        return (
            <div className="px-4 py-20 text-center">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} className="text-red-500" />
                </div>
                <h2 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">Nasiya topilmadi</h2>
                <Link to="/debts" className="btn btn-primary inline-flex">
                    Nasiyalarga qaytish
                </Link>
            </div>
        )
    }

    const paidAmount = (parseFloat(debt.total_amount) || 0) - (parseFloat(debt.remaining_amount) || 0)
    const progress = parseFloat(debt.total_amount) > 0
        ? Math.round((paidAmount / parseFloat(debt.total_amount)) * 100)
        : 0

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
            {/* Header */}
            <div className="flex items-center gap-2 mb-6 text-blue-500 font-medium translate-x-[-4px]">
                <ArrowLeft size={18} />
                <Link to="/debts" className="text-[15px]">Nasiyalar</Link>
            </div>

            {/* Debt Card Detail */}
            <div className="card dark:bg-gray-800 p-5 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-[14px] font-semibold text-gray-700 dark:text-gray-300">
                        <Clock size={16} className="text-gray-400" />
                        <span>{debt.status === 'closed' ? 'Yopilgan' : 'Faol'}</span>
                    </div>
                    <div className="flex gap-2">
                        {debt.status === 'open' && (
                            <button
                                onClick={handleCloseDebt}
                                disabled={submitting}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-[14px] font-semibold text-gray-700 dark:text-gray-200 active:scale-95 transition-transform"
                            >
                                <CheckCircle2 size={16} className="text-green-500" />
                                Yopish
                            </button>
                        )}
                        <button
                            onClick={handleDeleteDebt}
                            disabled={submitting}
                            className="w-10 h-10 flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-xl text-red-500 active:scale-95 transition-transform"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>

                {/* Progress Bar Section */}
                <div className="mb-6">
                    <div className="flex justify-between items-end text-[13px] mb-2 font-medium">
                        <span className="text-gray-400">To'landi</span>
                        <span className="text-gray-900 dark:text-white text-[16px] font-bold">{progress}%</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-700 ease-out rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 border-t border-gray-100 dark:border-gray-700 pt-6">
                    <div className="text-center">
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Jami</p>
                        <p className="text-[15px] font-bold text-gray-900 dark:text-white">
                            {formatCurrency(debt.total_amount)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">To'landi</p>
                        <p className="text-[15px] font-bold text-green-500">
                            {formatCurrency(paidAmount)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Qoldi</p>
                        <p className="text-[15px] font-bold text-red-500">
                            {formatCurrency(debt.remaining_amount)}
                        </p>
                    </div>
                </div>

                {debt.description && (
                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-start gap-2">
                        <FileText size={16} className="text-gray-300 mt-0.5" />
                        <p className="text-[14px] text-gray-600 dark:text-gray-400 italic">
                            {debt.description}
                        </p>
                    </div>
                )}
            </div>

            {/* Add Payment Action */}
            {debt.status === 'open' && (
                <button
                    onClick={() => setShowPaymentForm(true)}
                    className="btn btn-primary w-full py-4 text-[16px] shadow-lg shadow-blue-500/20 mb-8"
                >
                    <Plus size={20} />
                    To'lov qo'shish
                </button>
            )}

            {/* Payment Modal/Inline Form */}
            {showPaymentForm && (
                <div className="card dark:bg-gray-800 p-5 mb-8 border-2 border-blue-500/20 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <CreditCard size={18} className="text-blue-500" />
                        <h3 className="font-bold text-gray-900 dark:text-white">Yangi to'lov</h3>
                    </div>
                    <form onSubmit={handleAddPayment} className="space-y-4">
                        <div>
                            <label className="label">Summa (so'm)</label>
                            <input
                                type="number"
                                className="input text-[18px] font-bold text-blue-500"
                                placeholder="0"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                min="1"
                                max={debt.remaining_amount}
                                required
                                autoFocus
                            />
                            <p className="text-[11px] text-gray-400 mt-1">Kiriting: max {formatCurrency(debt.remaining_amount)} so'm</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShowPaymentForm(false)}
                                className="btn bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-1"
                            >
                                Bekor
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn btn-primary flex-1"
                            >
                                {submitting ? <LoadingSpinner size="sm" /> : 'Saqlash'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* History List */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">
                        To'lovlar tarixi
                    </h2>
                    <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        {payments.length}
                    </span>
                </div>

                {payments.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-4">
                        <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center">
                            <CreditCard size={40} strokeWidth={1} />
                        </div>
                        <div className="text-center">
                            <p className="text-[16px] font-semibold">To'lovlar yo'q</p>
                            <p className="text-[14px]">Hali bu nasiyaga to'lov qilinmagan</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {payments.map(payment => (
                            <div
                                key={payment.id}
                                className="card dark:bg-gray-800 flex items-center justify-between p-4 active:scale-98 transition-transform"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                        <CheckCircle2 size={20} className="text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-[16px] font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(payment.amount)} <span className="text-[12px] font-normal text-gray-400">so'm</span>
                                        </p>
                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                                            <Calendar size={12} />
                                            {formatDate(payment.paid_at || payment.created_at)}
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
