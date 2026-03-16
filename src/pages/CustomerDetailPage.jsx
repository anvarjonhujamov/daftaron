import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Drawer } from 'vaul'
import { customersApi } from '../api/customers.api'
import { debtsApi } from '../api/debts.api'
import { paymentsApi } from '../api/payments.api'
import toast from 'react-hot-toast'
import {
    ChevronLeft, MoreVertical, Phone as PhoneIcon, MessageSquare,
    Plus, CreditCard, Loader2, FileText, X, Trash2
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { CustomerDetailSkeleton } from '../components/Skeleton'
import { formatCurrency, parseCurrency } from '../utils/format'


export default function CustomerDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [customer, setCustomer] = useState(null)
    const [debts, setDebts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showDebtDrawer, setShowDebtDrawer] = useState(false)
    const [showPaymentDrawer, setShowPaymentDrawer] = useState(false)
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
    const [paymentForm, setPaymentForm] = useState({ amount: '', description: '', debt_id: null, paid_at: '' })
    const [paymentErrors, setPaymentErrors] = useState({})

    useEffect(() => {
        loadData()
    }, [id])

    const loadData = async () => {
        try {
            const customerId = parseInt(id)
            const [customerData, debtsData] = await Promise.all([
                customersApi.getCustomer(id),
                debtsApi.getDebts({ per_page: 100 })
            ])
            setCustomer(customerData.data || customerData)
            // Filter debts to only show this customer's debts
            const allDebts = Array.isArray(debtsData) ? debtsData : (debtsData.data || [])
            const customerDebts = allDebts.filter(d =>
                d.customer_id === customerId ||
                d.customer?.id === customerId
            )
            setDebts(customerDebts)
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
            toast.success(
                <div>
                    <p className="font-bold">Nasiya qo'shildi</p>
                    <p className="text-sm">Yangi bildirishnoma bor</p>
                </div>
            )
            loadData()
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

    const handleAddPayment = async (e) => {
        e.preventDefault()
        let remainingPayment = parseCurrency(paymentForm.amount)
        if (!remainingPayment || remainingPayment <= 0) return

        // Identify all open debts, sorted by ID (usually oldest first) or date
        const openDebts = debts
            .filter(d => d.status === 'open')
            .sort((a, b) => a.id - b.id)

        if (openDebts.length === 0) {
            toast.error('Faol nasiya topilmadi')
            return
        }

        // If a specific debt was selected via "To'lov qilish" on a card, move it to the front
        if (paymentForm.debt_id) {
            const targetIdx = openDebts.findIndex(d => d.id === paymentForm.debt_id)
            if (targetIdx > -1) {
                const [target] = openDebts.splice(targetIdx, 1)
                openDebts.unshift(target)
            }
        }

        setSubmitting(true)
        setPaymentErrors({})
        try {
            // Process payments sequentially
            for (const debt of openDebts) {
                if (remainingPayment <= 0) break

                const debtBalance = parseFloat(debt.remaining_amount) || 0
                const paymentForThisDebt = Math.min(remainingPayment, debtBalance)

                if (paymentForThisDebt > 0) {
                    await paymentsApi.createPayment({
                        debt_id: debt.id,
                        amount: paymentForThisDebt,
                        paid_at: paymentForm.paid_at || null
                    })
                    remainingPayment -= paymentForThisDebt
                }
            }

            setPaymentForm({ amount: '', description: '', debt_id: null, paid_at: '' })
            setPaymentErrors({})
            setShowPaymentDrawer(false)
            toast.success(
                <div>
                    <p className="font-bold">To'lov qabul qilindi</p>
                    <p className="text-sm">Yangi bildirishnoma bor</p>
                </div>
            )
            loadData()
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                setPaymentErrors(err.response.data.errors)
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

    const totalDebt = debts.length > 0
        ? sumRemaining
        : parseFloat(
            customer.remaining_amount ??
            customer.remaining_debts ??
            customer.debt_sum ??
            customer.balance ??
            customer.total_debt ?? 0
        )

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-24 transition-colors">
            {/* Unified Hero Section */}
            <div className="bg-white dark:bg-gray-800 pt-1 pb-6 rounded-b-[32px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-none border-b border-gray-100 dark:border-gray-700/50 transition-all">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-1 mb-2">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center active:scale-90 transition-transform"
                    >
                        <ChevronLeft size={20} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                        onClick={() => setShowOptionsDrawer(true)}
                        className="w-9 h-9 rounded-full bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center active:scale-90 transition-transform"
                    >
                        <MoreVertical size={18} className="text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                {/* Profile & Balance Info */}
                <div className="flex flex-col items-center text-center px-6">
                    <h1 className="text-[20px] font-bold text-gray-900 dark:text-white mb-0.5 leading-tight">
                        {customer.name}
                    </h1>
                    <p className="text-gray-400 dark:text-gray-500 text-[13px] font-medium mb-4">
                        {formatPhone(customer.phone)}
                    </p>

                    <div className={`text-[32px] font-extrabold tracking-tight mb-2 ${totalDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatCurrency(totalDebt)} <span className="text-[14px] font-bold opacity-70">so'm</span>
                    </div>

                    <div className={`inline-flex items-center px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        totalDebt > 0 
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-900/30' 
                            : 'bg-green-50 dark:bg-green-900/20 text-green-500 border border-green-100 dark:border-green-900/30'
                    }`}>
                        {totalDebt > 0 ? 'Qarzdor' : 'To\'langan'}
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
                    <button onClick={() => setShowDebtDrawer(true)} className="btn btn-outline-danger flex-1 py-3 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400">
                        <Plus size={18} />Nasiya
                    </button>
                    <button
                        onClick={() => setShowPaymentDrawer(true)}
                        disabled={totalDebt <= 0}
                        className={`btn flex-1 py-3 ${totalDebt > 0 ? 'btn-outline-success bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20 text-green-600 dark:text-green-400' : 'border border-gray-200 text-gray-400 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 opacity-60 cursor-not-allowed'}`}
                    >
                        <Plus size={18} />To'lov
                    </button>
                </div>
            </div>

            {/* Timeline */}
            <div className="px-4 mt-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">Tarix</h2>
                    <span className="text-[13px] text-gray-400">{debts.length} ta yozuv</span>
                </div>
                {debts.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-3xl text-gray-400">Hali nasiya yo'q</div>
                ) : (
                    <div className="space-y-4">
                        {debts.map(debt => (
                            <div key={debt.id} className="card !p-4 border-0 shadow-sm bg-white dark:bg-gray-800">
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`badge px-2 py-0.5 rounded-lg text-[11px] ${debt.status === 'closed' ? 'badge-paid' : 'badge-debtor'}`}>
                                        {debt.status === 'closed' ? 'Yopilgan' : 'Faol'}
                                    </span>
                                    <span className="text-[11px] text-gray-400">{formatDate(debt.created_at)}</span>
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
                                        <FileText size={14} className="text-gray-400 mt-0.5" />
                                        <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-tight">
                                            {debt.description}
                                        </p>
                                    </div>
                                )}

                                {debt.status !== 'closed' && (
                                    <button
                                        onClick={() => {
                                            setPaymentForm({ ...paymentForm, amount: debt.remaining_amount.toString(), debt_id: debt.id })
                                            setShowPaymentDrawer(true)
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
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                                        <input
                                            id="customer_send_sms"
                                            type="checkbox"
                                            className="w-5 h-5 rounded-md border-gray-300 text-blue-500 focus:ring-blue-500"
                                            checked={debtForm.send_sms}
                                            onChange={(e) => setDebtForm({ ...debtForm, send_sms: e.target.checked })}
                                        />
                                        <div className="text-[13px] text-gray-600 dark:text-gray-300">
                                            <label htmlFor="customer_send_sms" className="font-bold">
                                                Mijozga SMS yuborish
                                            </label>
                                            <p className="text-[11px] text-gray-400 opacity-80">
                                                Limitdan keyin balansdan yechiladi.
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

            {/* Add Payment Drawer */}
            <Drawer.Root open={showPaymentDrawer} onOpenChange={(open) => {
                setShowPaymentDrawer(open)
                if (!open) {
                    setTimeout(() => {
                        setPaymentForm({ amount: '', description: '', debt_id: null, paid_at: '' })
                        setPaymentErrors({})
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
                                        To'lov qo'shish
                                    </Drawer.Title>
                                    <Drawer.Description className="text-gray-400 text-[14px]">
                                        {customer.name} uchun to'lov
                                    </Drawer.Description>
                                </div>
                                <button onClick={() => setShowPaymentDrawer(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>
                            <form onSubmit={handleAddPayment} className="space-y-4">
                                <div>
                                    <label className="label">Summa</label>
                                    <div className="relative">
                                        <CreditCard size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${paymentErrors.amount ? 'text-red-400' : 'text-gray-400'}`} />
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className={`input pl-11 pr-16 ${paymentErrors.amount ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                            placeholder="0"
                                            value={paymentForm.amount}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, '')
                                                setPaymentForm({
                                                    ...paymentForm,
                                                    amount: digits ? formatCurrency(digits) : ''
                                                })
                                                if (paymentErrors.amount) setPaymentErrors({ ...paymentErrors, amount: null })
                                            }}
                                            required
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">so'm</span>
                                    </div>
                                    {paymentErrors.amount && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{paymentErrors.amount[0]}</p>}
                                </div>
                                <div>
                                    <label className="label">To'lov sanasi (ixtiyoriy)</label>
                                    <input
                                        type="date"
                                        className={`input ${paymentErrors.paid_at ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                        value={paymentForm.paid_at}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => {
                                            setPaymentForm({ ...paymentForm, paid_at: e.target.value })
                                            if (paymentErrors.paid_at) setPaymentErrors({ ...paymentErrors, paid_at: null })
                                        }}
                                    />
                                    {paymentErrors.paid_at && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{paymentErrors.paid_at[0]}</p>}
                                </div>
                                <button type="submit" className="btn btn-orange w-full py-4 text-[16px] font-bold" disabled={submitting}>
                                    {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Saqlash'}
                                </button>
                            </form>
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
        </div>
    )
}
