import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Drawer } from 'vaul'
import { customersApi } from '../api/customers.api'
import { debtsApi } from '../api/debts.api'
import { paymentsApi } from '../api/payments.api'
import {
    ChevronLeft, MoreVertical, Phone as PhoneIcon, MessageSquare,
    Plus, CreditCard, Loader2, FileText, X
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

export default function CustomerDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [customer, setCustomer] = useState(null)
    const [debts, setDebts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showDebtDrawer, setShowDebtDrawer] = useState(false)
    const [showPaymentDrawer, setShowPaymentDrawer] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [debtForm, setDebtForm] = useState({ amount: '', description: '' })
    const [paymentForm, setPaymentForm] = useState({ amount: '', description: '', debt_id: null })

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
            const allDebts = debtsData.data || []
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
        if (!debtForm.amount) return
        setSubmitting(true)
        try {
            await debtsApi.createDebt({
                customer_id: parseInt(id),
                total_amount: parseFloat(debtForm.amount),
                description: debtForm.description || null
            })
            setDebtForm({ amount: '', description: '' })
            setShowDebtDrawer(false)
            loadData()
        } catch (err) {
            alert(err.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSubmitting(false)
        }
    }

    const handleAddPayment = async (e) => {
        e.preventDefault()
        if (!paymentForm.amount) return

        // Use specified debt_id or find first open one
        const targetDebtId = paymentForm.debt_id || debts.find(d => d.status === 'open')?.id

        if (!targetDebtId) {
            alert('Faol nasiya topilmadi')
            return
        }

        setSubmitting(true)
        try {
            await paymentsApi.createPayment({
                debt_id: targetDebtId,
                amount: parseFloat(paymentForm.amount)
            })
            setPaymentForm({ amount: '', description: '', debt_id: null })
            setShowPaymentDrawer(false)
            loadData()
        } catch (err) {
            alert(err.response?.data?.message || 'Xatolik yuz berdi')
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

    const formatCurrency = (amount) => new Intl.NumberFormat('uz-UZ').format(amount || 0)

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
        return new Date(dateString).toLocaleDateString('uz-UZ', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
    }

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>
    }

    if (!customer) {
        return <div className="flex items-center justify-center min-h-screen"><p className="text-gray-500">Mijoz topilmadi</p></div>
    }

    const totalDebt = customer.total_debt || debts.reduce((sum, d) => sum + (d.remaining_amount || 0), 0)

    return (
        <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-24 transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-800">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <ChevronLeft size={22} className="text-gray-600 dark:text-gray-300" />
                </button>
                <button className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <MoreVertical size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
            </div>

            {/* Profile Section */}
            <div className="flex flex-col items-center py-6 bg-white dark:bg-gray-800">
                <div className="avatar avatar-lg mb-4">{customer.name?.charAt(0)?.toUpperCase()}</div>
                <h1 className="text-[22px] font-bold text-gray-900 dark:text-white mb-1">{customer.name}</h1>
                <p className="text-gray-400 text-[15px]">{formatPhone(customer.phone)}</p>
            </div>

            {/* Balance Card */}
            <div className="px-4 -mt-2">
                <div className="card text-center py-6">
                    <p className="text-gray-500 dark:text-gray-400 text-[14px] mb-2">Joriy balans</p>
                    <div className={`text-[28px] font-bold mb-3 ${totalDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatCurrency(totalDebt)} so'm
                    </div>
                    <span className={`badge ${totalDebt > 0 ? 'badge-debtor' : 'badge-paid'}`}>
                        {totalDebt > 0 ? 'Qarzdor' : 'To\'langan'}
                    </span>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 mt-4">
                <div className="flex gap-3 mb-4">
                    <button onClick={handleCall} className="btn btn-outline flex-1"><PhoneIcon size={18} />Qo'ng'iroq</button>
                    <button onClick={handleMessage} className="btn btn-outline flex-1"><MessageSquare size={18} />Xabar</button>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setShowDebtDrawer(true)} className="btn btn-outline-danger flex-1"><Plus size={18} />Nasiya qo'shish</button>
                    <button onClick={() => setShowPaymentDrawer(true)} className="btn btn-outline-success flex-1"><Plus size={18} />To'lov qo'shish</button>
                </div>
            </div>

            {/* Timeline */}
            <div className="px-4 mt-6">
                <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white mb-4">Timeline tarixi</h2>
                {debts.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">Hali nasiya yo'q</div>
                ) : (
                    <div className="space-y-4">
                        {debts.map(debt => (
                            <div key={debt.id} className="card overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <span className={`badge ${debt.status === 'closed' ? 'badge-paid' : 'badge-debtor'}`}>
                                        {debt.status === 'closed' ? 'Yopilgan' : 'Faol'}
                                    </span>
                                    <span className="text-[12px] text-gray-400">{formatDate(debt.created_at)}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-3">
                                    <div>
                                        <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-1">Jami summa</p>
                                        <p className="text-[17px] font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(debt.total_amount)} <span className="text-[13px] font-normal">so'm</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-1">Qolgan qarz</p>
                                        <p className={`text-[17px] font-bold ${debt.remaining_amount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                            {formatCurrency(debt.remaining_amount)} <span className="text-[13px] font-normal">so'm</span>
                                        </p>
                                    </div>
                                </div>

                                {debt.description && (
                                    <div className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-3">
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
                                        className="btn btn-primary w-full py-2 text-[14px]"
                                    >
                                        <CreditCard size={16} />
                                        To'lov qilish
                                    </button>
                                )}

                                <Link
                                    to={`/debts/${debt.id}`}
                                    className="block text-center mt-3 text-[13px] text-blue-500 font-medium"
                                >
                                    Batafsil ko'rish
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Debt Drawer */}
            <Drawer.Root open={showDebtDrawer} onOpenChange={setShowDebtDrawer}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh]">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                        Nasiya qo'shish
                                    </Drawer.Title>
                                    <Drawer.Description className="text-gray-400 text-[14px]">
                                        {customer.name} uchun yangi nasiya qo'shish
                                    </Drawer.Description>
                                </div>
                                <button onClick={() => setShowDebtDrawer(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>
                            <form onSubmit={handleAddDebt} className="space-y-4">
                                <div>
                                    <label className="label">Summa</label>
                                    <div className="relative">
                                        <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="number" className="input pl-11 pr-16" placeholder="0" value={debtForm.amount} onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })} required />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">so'm</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Izoh (ixtiyoriy)</label>
                                    <div className="relative">
                                        <FileText size={18} className="absolute left-4 top-4 text-gray-400" />
                                        <textarea className="input pl-11 min-h-[80px] resize-none" placeholder="Tavsif qo'shish..." value={debtForm.description} onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })} />
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-orange w-full" disabled={submitting}>
                                    {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Saqlash'}
                                </button>
                            </form>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* Add Payment Drawer */}
            <Drawer.Root open={showPaymentDrawer} onOpenChange={setShowPaymentDrawer}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh]">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                        To'lov qo'shish
                                    </Drawer.Title>
                                    <Drawer.Description className="text-gray-400 text-[14px]">
                                        {customer.name} uchun yangi to'lov qo'shish
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
                                        <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="number" className="input pl-11 pr-16" placeholder="0" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">so'm</span>
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-orange w-full" disabled={submitting}>
                                    {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Saqlash'}
                                </button>
                            </form>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    )
}
