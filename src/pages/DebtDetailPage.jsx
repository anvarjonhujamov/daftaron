import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { debtsApi } from '../api/debts.api'
import { staffApi } from '../api/staff.api'
import {
    Clock, CheckCircle2, Trash2, ArrowLeft,
    FileText, Calendar, ChevronRight, CreditCard,
    Wallet, Tag, CalendarDays, CalendarClock, BellOff,
    X, AlertTriangle, Edit2
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { CustomerDetailSkeleton } from '../components/Skeleton'
import { formatCurrency, parseCurrency } from '../utils/format'
import { todayYmd, toYmd, diffDaysYmd } from '../utils/date'
import EmptyState from '../components/EmptyState'
import toast from 'react-hot-toast'
import { useSubscription } from '../contexts/SubscriptionContext'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Drawer } from 'vaul'
import { isUserStaff } from '../utils/roleHelper'

export default function DebtDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [debt, setDebt] = useState(null)
    const [payments, setPayments] = useState([])
    const [staffMembers, setStaffMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const { status: subStatus, remaining } = useSubscription()
    const [showBlockedDrawer, setShowBlockedDrawer] = useState(false)
    const [isStaff, setIsStaff] = useState(false)
    const [showEditDrawer, setShowEditDrawer] = useState(false)
    // returnDateTouched: foydalanuvchi qaytarish sanasiga tegmasa, kalit umuman yuborilmaydi (sana o'zgarmaydi)
    const [editForm, setEditForm] = useState({ amount: '', description: '', return_date: '', returnDateTouched: false })
    const [editErrors, setEditErrors] = useState({})

    useEffect(() => {
        loadData()
        loadStaff()
    }, [id])

    useEffect(() => {
        const check = async () => {
            try {
                const staffUser = await isUserStaff(staffApi)
                setIsStaff(staffUser)
            } catch (err) {
                console.error('Failed to check staff status:', err)
            }
        }
        check()
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
            const debtData = await debtsApi.getDebt(id)
            const debtInfo = debtData.data || debtData
            setDebt(debtInfo)
            setPayments(debtInfo.payments || [])
        } catch (err) {
            console.error('Failed to load debt:', err)
            setDebt(null)
            setPayments([])
        } finally {
            setLoading(false)
        }
    }


    const handleCloseDebt = async () => {
        if (isStaff) {
            toast.error("Xodim nasiyani yopishi mumkin emas")
            return
        }
        if (subStatus === 'expired') {
            setShowBlockedDrawer(true)
            return
        }
        if (!confirm('Bu nasiyani yopmoqchimisiz?')) return

        setSubmitting(true)
        try {
            await debtsApi.closeDebt(id)
            toast.success('Nasiya yopildi')
            loadData()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSubmitting(false)
        }
    }

    const openEditDrawer = () => {
        if (subStatus === 'expired') {
            setShowBlockedDrawer(true)
            return
        }
        setEditForm({
            amount: formatCurrency(debt.total_amount),
            description: debt.description || '',
            return_date: toYmd(debt.return_date),
            returnDateTouched: false
        })
        setEditErrors({})
        setShowEditDrawer(true)
    }

    const handleUpdateDebt = async (e) => {
        e.preventDefault()
        const numericAmount = parseCurrency(editForm.amount)
        if (!numericAmount) return

        if (editForm.returnDateTouched && editForm.return_date && editForm.return_date < todayYmd()) {
            setEditErrors({ return_date: ['Qaytarish sanasi bugundan oldin bo\'lishi mumkin emas'] })
            return
        }

        const payload = {
            customer_id: debt.customer_id ?? debt.customer?.id,
            total_amount: numericAmount,
            description: editForm.description || null
        }
        if (editForm.returnDateTouched) {
            payload.return_date = editForm.return_date || null
        }

        setSubmitting(true)
        setEditErrors({})
        try {
            await debtsApi.updateDebt(id, payload)
            toast.success('Nasiya yangilandi')
            setShowEditDrawer(false)
            loadData()
        } catch (err) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                setEditErrors(err.response.data.errors)
            } else {
                toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteDebt = async () => {
        if (isStaff) {
            toast.error("Xodim nasiyani o'chira olmaydi")
            return
        }
        if (subStatus === 'expired') {
            setShowBlockedDrawer(true)
            return
        }
        if (!confirm('Bu nasiyani o\'chirmoqchimisiz?')) return

        setSubmitting(true)
        try {
            await debtsApi.deleteDebt(id)
            toast.success('Nasiya o\'chirildi')
            navigate('/debts')
        } catch (err) {
            toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSubmitting(false)
        }
    }

    // debt_date UTC ISO keladi ("2026-09-07T19:00:00Z" = Toshkentda 08.09) -> toYmd orqali Toshkentga o'tkaziladi
    const formatDate = (dateString) => {
        const ymd = toYmd(dateString)
        if (!ymd) return ''
        const [yyyy, mm, dd] = ymd.split('-')
        return `${mm}/${dd}/${yyyy}`
    }

    const formatDateTime = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const yyyy = date.getFullYear()
        const hh = String(date.getHours()).padStart(2, '0')
        const min = String(date.getMinutes()).padStart(2, '0')
        return `${mm}/${dd}/${yyyy} ${hh}:${min}`
    }

    const getStaffNameById = (userId) => {
        if (!userId) return null
        const staff = staffMembers.find((s) => String(s.id) === String(userId))
        return staff?.name || `ID: ${userId}`
    }

    const getCreatorName = (item) => {
        if (!item) return null
        // Direct createdBy object with name
        if (item.createdBy && typeof item.createdBy === 'object' && item.createdBy.name) {
            return item.createdBy.name
        }
        // Direct user object with name
        if (item.user && typeof item.user === 'object' && item.user.name) {
            return item.user.name
        }
        // Direct created_by object with name
        if (item.created_by && typeof item.created_by === 'object' && item.created_by.name) {
            return item.created_by.name
        }
        // Direct name field
        if (item.created_by_name) {
            return item.created_by_name
        }
        if (item.creator_name) {
            return item.creator_name
        }
        // Try different ID fields
        const userId = item.created_by_user_id || item.user_id || item.staff_id || item.creator_id
        if (userId) {
            const creator = getStaffNameById(userId)
            if (creator && creator !== `ID: ${userId}`) return creator
        }
        return null
    }

    if (loading) {
        return <CustomerDetailSkeleton />
    }

    if (!debt) {
        return (
            <div className="px-4 py-20 text-center">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} className="text-red-500" />
                </div>
                <h2 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">Nasiya topilmadi</h2>
                <button onClick={() => navigate(-1)} className="btn btn-primary inline-flex">
                    Orqaga qaytish
                </button>
            </div>
        )
    }

    const paidAmount = (parseFloat(debt.total_amount) || 0) - (parseFloat(debt.remaining_amount) || 0)
    const progress = parseFloat(debt.total_amount) > 0
        ? Math.round((paidAmount / parseFloat(debt.total_amount)) * 100)
        : 0

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors overflow-x-hidden">
            {/* Header */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 mb-6 text-blue-500 font-medium active:opacity-60 transition-opacity"
            >
                <ArrowLeft size={18} />
                <span className="text-[16px] font-semibold">Orqaga</span>
            </button>

            {/* Debt Card Detail */}
            <div className="card dark:bg-gray-800 p-5 mb-6 shadow-sm border border-gray-100 dark:border-gray-700">
                {/* Header with Customer Info + Return Date + SMS Status */}
                <div className="mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <p className="text-[12px] text-gray-400 uppercase font-bold tracking-wider mb-1">Mijoz</p>
                            <p className="text-[18px] font-bold text-gray-900 dark:text-white">
                                {debt.customer?.name || "Noma'lum mijoz"}
                            </p>
                            {debt.customer?.phone && (
                                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
                                    {debt.customer.phone}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-[12px] text-gray-400 uppercase font-bold tracking-wider mb-1">Sana</p>
                            <p className="text-[15px] font-semibold text-gray-700 dark:text-gray-200">
                                {formatDate(debt.debt_date || debt.created_at)}
                            </p>
                        </div>
                    </div>

                    {/* Return Date + SMS Status block (NEW) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100/60 dark:border-gray-700/60">
                        {/* Return Date Badge */}
                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/80 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                <CalendarDays size={16} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] text-gray-400 uppercase tracking-wider font-bold mb-1">Qaytarish sanasi</p>
                                {(() => {
                                    const rd = debt.return_date || debt.due_date || null
                                    if (!rd) {
                                        return <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 italic">Belgilanmagan</p>
                                    }
                                    const diffDays = diffDaysYmd(toYmd(rd), todayYmd())
                                    const isOverdue = diffDays < 0 && debt.status !== 'closed' && Number(debt.remaining_amount || 0) > 0
                                    const isDueSoon = diffDays >= 0 && diffDays <= 3 && debt.status !== 'closed' && Number(debt.remaining_amount || 0) > 0
                                    const isPaid = debt.status === 'closed' || Number(debt.remaining_amount || 0) === 0
                                    const color = isPaid
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : isOverdue
                                            ? 'text-red-600 dark:text-red-400'
                                            : isDueSoon
                                                ? 'text-amber-600 dark:text-amber-400'
                                                : 'text-gray-800 dark:text-gray-100'
                                    const text = isPaid
                                        ? `To'langan (${formatDate(rd)})`
                                        : isOverdue
                                            ? `Kechikkan ${Math.abs(diffDays)} kun • ${formatDate(rd)}`
                                            : isDueSoon
                                                ? diffDays === 0
                                                    ? `Bugun • ${formatDate(rd)}`
                                                    : `${diffDays} kun qoldi • ${formatDate(rd)}`
                                                : formatDate(rd)
                                    return <p className={`text-[13px] font-bold ${color} leading-snug`}>{text}</p>
                                })()}
                            </div>
                        </div>

                        {/* SMS Status Badge (Return Date SMS) */}
                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/80 flex items-start gap-3">
                            {(() => {
                                const rd = debt.return_date || debt.due_date || null
                                const smsStatus = debt.return_date_sms_status || debt.return_sms_status || debt.sms_status || null
                                if (!rd) {
                                    return (
                                        <>
                                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-600/50 flex items-center justify-center shrink-0">
                                                <X size={16} className="text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] text-gray-400 uppercase tracking-wider font-bold mb-1">SMS xolat</p>
                                                <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 italic">Sana belgilanmagan</p>
                                            </div>
                                        </>
                                    )
                                }
                                if (smsStatus === 'sent') {
                                    return (
                                        <>
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] text-gray-400 uppercase tracking-wider font-bold mb-1">Qaytarish SMS</p>
                                                <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">Yuborildi</p>
                                                {(debt.return_sms_sent_at || debt.return_date_sms_sent_at) && (
                                                    <p className="text-[12px] text-gray-400 mt-0.5">{formatDateTime(debt.return_sms_sent_at || debt.return_date_sms_sent_at)}</p>
                                                )}
                                            </div>
                                        </>
                                    )
                                }
                                if (smsStatus === 'limit_exceeded' || smsStatus === 'skipped_limit') {
                                    return (
                                        <>
                                            <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                                <BellOff size={16} className="text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] text-gray-400 uppercase tracking-wider font-bold mb-1">Qaytarish SMS</p>
                                                <p className="text-[13px] font-bold text-amber-600 dark:text-amber-300">SMS limiti tugagan</p>
                                                <p className="text-[12px] text-gray-400 mt-0.5 opacity-80">
                                                    {(debt.return_date_sms_error || debt.return_sms_error) === 'customer_phone_missing'
                                                        ? 'Mijoz telefon raqami belgilanmagan'
                                                        : 'SMS yuborib bo\'lmadi. Paketni sotib oling va qayta jo\'nating.'}
                                                </p>
                                            </div>
                                        </>
                                    )
                                }
                                if (smsStatus === 'failed') {
                                    return (
                                        <>
                                            <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                                <X size={16} className="text-red-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] text-gray-400 uppercase tracking-wider font-bold mb-1">Qaytarish SMS</p>
                                                <p className="text-[13px] font-bold text-red-600 dark:text-red-400">Xato</p>
                                                <p className="text-[12px] text-gray-400 mt-0.5 opacity-80">{debt.return_date_sms_error || debt.return_sms_error || 'Qayta urinib ko\'ring'}</p>
                                            </div>
                                        </>
                                    )
                                }
                                if (smsStatus === 'pending' || smsStatus === 'queued') {
                                    return (
                                        <>
                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                <Clock size={16} className="text-blue-500 animate-pulse" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] text-gray-400 uppercase tracking-wider font-bold mb-1">Qaytarish SMS</p>
                                                <p className="text-[13px] font-bold text-blue-600 dark:text-blue-400">Kutilmoqda</p>
                                                <p className="text-[12px] text-gray-400 mt-0.5 opacity-80">Qaytarish kuni soat 09:00 da yuboriladi</p>
                                            </div>
                                        </>
                                    )
                                }
                                // smsStatus === null bo'lganda — return_date ga qaraymiz
                                const rdPassedOrDue = toYmd(rd) <= todayYmd()
                                if (rdPassedOrDue) {
                                    // return_date kelib o'tgan lekin status null → hech qanday SMS jo'natilmagan / backend statusi yozilmagan
                                    return (
                                        <>
                                            <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                                <AlertTriangle size={16} className="text-red-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] text-gray-400 uppercase tracking-wider font-bold mb-1">Qaytarish SMS</p>
                                                <p className="text-[13px] font-bold text-red-600 dark:text-red-400">Yuborilmagan</p>
                                                <p className="text-[12px] text-gray-400 mt-0.5 opacity-80">Qaytarish sanasi o'tib ketgan, SMS holati backenddan yuklanmadi.</p>
                                            </div>
                                        </>
                                    )
                                }
                                // return_date hali kelmagan (kelajakda)
                                return (
                                    <>
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-600/40 flex items-center justify-center shrink-0">
                                            <CalendarClock size={16} className="text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[12px] text-gray-400 uppercase tracking-wider font-bold mb-1">Qaytarish SMS</p>
                                            <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 italic">Hali vaqti kelmagan</p>
                                            <p className="text-[12px] text-gray-400 mt-0.5 opacity-80">Qaytarish sanasida avtomatik jo'natiladi</p>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-[14px] font-semibold text-gray-700 dark:text-gray-300">
                        <Clock size={16} className="text-gray-400" />
                        <span>{debt.status === 'closed' ? 'Yopilgan' : 'Faol'}</span>
                    </div>
                    {!isStaff && (
                        <div className="flex gap-2">
                            {debt.status === 'open' && (
                                <button
                                    onClick={openEditDrawer}
                                    disabled={submitting}
                                    aria-label="Tahrirlash"
                                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-blue-500 active:scale-95 transition-transform"
                                >
                                    <Edit2 size={18} />
                                </button>
                            )}
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
                    )}
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
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Jami</p>
                        <p className="text-[15px] font-bold text-gray-900 dark:text-white">
                            {formatCurrency(debt.total_amount)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">To'landi</p>
                        <p className="text-[15px] font-bold text-green-500">
                            {formatCurrency(paidAmount)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Qoldi</p>
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


            {/* History List */}
            {payments.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">
                            To'lovlar tarixi
                        </h2>
                        <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            {payments.length}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {payments.map(payment => {
                            const pType = String(payment.payment_type || '').toLowerCase()
                            const dId = payment.debt_id ?? payment.debtId ?? payment.debt?.id
                            const isBalance = pType.includes('balance') || pType.includes('customer') || pType.includes('deposit') || pType.includes('umumiy')
                                || (dId === null || dId === undefined || String(dId) === '0' || String(dId) === 'null')
                            return (
                                <div
                                    key={payment.id}
                                    className="card dark:bg-gray-800 flex items-center justify-between p-4 active:scale-98 transition-transform"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            isBalance
                                                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                                : 'bg-green-50 dark:bg-green-900/20'
                                        }`}>
                                            {isBalance
                                                ? <Wallet size={20} className="text-emerald-500" />
                                                : <CheckCircle2 size={20} className="text-green-500" />
                                            }
                                        </div>
                                        <div>
                                            <p className="text-[16px] font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(payment.amount)} <span className="text-[12px] font-normal text-gray-400">so'm</span>
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider ${
                                                    isBalance
                                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/60 dark:border-emerald-900/30'
                                                        : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100/60 dark:border-green-900/30'
                                                }`}>
                                                    {isBalance ? <Wallet size={10} /> : <Tag size={10} />}
                                                    {isBalance ? 'Balansdan' : 'Qarz uchun'}
                                                </span>
                                                <span className="inline-flex items-center gap-1 text-[12px] text-gray-400">
                                                    <Calendar size={12} />
                                                    {formatDateTime(payment.paid_at || payment.created_at)}
                                                </span>
                                            </div>
                                            {getCreatorName(payment) && (
                                                <p className="text-[12px] text-gray-400 mt-1">
                                                    <span className="font-semibold">Qabul qilgan:</span> {getCreatorName(payment)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
            {/* Edit Debt Drawer */}
            <Drawer.Root open={showEditDrawer} onOpenChange={setShowEditDrawer} repositionInputs={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh] outline-none">
                        <div className="p-4">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between mb-4">
                                <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                    Nasiyani tahrirlash
                                </Drawer.Title>
                                <button onClick={() => setShowEditDrawer(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>
                            <div className="overflow-y-auto max-h-[calc(85vh-80px)] px-4 pb-8">
                                <form onSubmit={handleUpdateDebt} className="space-y-4">
                                    <div>
                                        <label className="label">Summa</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className={`input ${editErrors.total_amount ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                            value={editForm.amount}
                                            onChange={(e) => {
                                                const digits = e.target.value.replace(/\D/g, '')
                                                setEditForm({ ...editForm, amount: digits ? formatCurrency(digits) : '' })
                                                if (editErrors.total_amount) setEditErrors({ ...editErrors, total_amount: null })
                                            }}
                                            required
                                        />
                                        {editErrors.total_amount && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{editErrors.total_amount[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="label">Izoh (ixtiyoriy)</label>
                                        <textarea
                                            className={`input min-h-[80px] resize-none ${editErrors.description ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                            maxLength={500}
                                            value={editForm.description}
                                            onChange={(e) => {
                                                setEditForm({ ...editForm, description: e.target.value })
                                                if (editErrors.description) setEditErrors({ ...editErrors, description: null })
                                            }}
                                        />
                                        {editErrors.description && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{editErrors.description[0]}</p>}
                                    </div>
                                    <div>
                                        <label className="label flex items-center gap-1">
                                            <CalendarDays size={12} className="text-indigo-500" />
                                            Qaytarish sanasi (ixtiyoriy)
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                className={`input flex-1 border-indigo-100 dark:border-indigo-900/40 focus:border-indigo-500 focus:ring-indigo-500/20 ${editErrors.return_date ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                                                value={editForm.return_date}
                                                // Eski (o'tgan) sanaga tegilmagan bo'lsa min qo'ymaymiz, aks holda forma submit bo'lmaydi
                                                min={editForm.returnDateTouched || !editForm.return_date || editForm.return_date >= todayYmd() ? todayYmd() : undefined}
                                                onChange={(e) => {
                                                    setEditForm({ ...editForm, return_date: e.target.value, returnDateTouched: true })
                                                    if (editErrors.return_date) setEditErrors({ ...editErrors, return_date: null })
                                                }}
                                            />
                                            {editForm.return_date && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditForm({ ...editForm, return_date: '', returnDateTouched: true })
                                                        if (editErrors.return_date) setEditErrors({ ...editErrors, return_date: null })
                                                    }}
                                                    className="px-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-[13px] font-semibold text-gray-600 dark:text-gray-300"
                                                >
                                                    Tozalash
                                                </button>
                                            )}
                                        </div>
                                        {editErrors.return_date && <p className="text-red-500 text-[13px] mt-1.5 ml-1">{editErrors.return_date[0]}</p>}
                                        <p className="text-[12px] text-gray-400 mt-1">
                                            Shu kuni soat 09:00 da mijozga SMS eslatma boriladi
                                        </p>
                                    </div>
                                    <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                                        {submitting ? <LoadingSpinner size="sm" /> : 'Saqlash'}
                                    </button>
                                </form>
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
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-100 dark:bg-red-900/30">
                                <AlertCircle size={32} className="text-red-500" />
                            </div>
                            
                            <h3 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">
                                Obunangiz tugagan
                            </h3>
                            
                            <p className="text-gray-500 dark:text-gray-400 mb-8 px-4 leading-relaxed">
                                Obunangiz tugagan. Sizda hali <b>{remaining} ta</b> nasiya limiti mavjud.
                                Yo'qotmaslik uchun obunani yangilang.
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                <Link
                                    to="/subscription"
                                    className="btn btn-primary w-full py-4 text-[16px] font-bold"
                                >
                                    <RefreshCw size={20} className="mr-2" />
                                    Obunani yangilash
                                </Link>
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
