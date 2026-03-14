import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { debtsApi } from '../api/debts.api'
import LoadingSpinner from '../components/LoadingSpinner'
import { CustomersSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { formatCurrency } from '../utils/format'
import { formatPhoneNumber } from '../utils/phoneMask'
import {
    ArrowLeft, Clock, Phone, MessageSquare, ChevronDown,
    ArrowUpDown, AlertTriangle, Send, Check, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function OverduePage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [overdueList, setOverdueList] = useState([])
    const [days, setDays] = useState(10)
    const [order, setOrder] = useState('asc') // asc = eng uzoq birinchi
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [sendingSms, setSendingSms] = useState(false)

    useEffect(() => {
        loadOverdue()
    }, [days, order])

    const loadOverdue = async () => {
        setLoading(true)
        try {
            const data = await debtsApi.getOverdue({ days, order })
            // API array qaytaradi
            setOverdueList(Array.isArray(data) ? data : (data.data || []))
        } catch (err) {
            console.error('Failed to load overdue:', err)
            toast.error(err.response?.data?.message || "Muddati o'tganlarni yuklashda xatolik")
        } finally {
            setLoading(false)
        }
    }

    const toggleSelect = (customerId) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(customerId)) {
                next.delete(customerId)
            } else {
                next.add(customerId)
            }
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === overdueList.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(overdueList.map(item => item.customer_id)))
        }
    }

    const handleSendSms = async () => {
        if (selectedIds.size === 0) return
        setSendingSms(true)

        try {
            const ids = Array.from(selectedIds)
            await debtsApi.sendOverdueSms(ids)
            toast.success(`${ids.length} ta mijozga SMS muvaffaqiyatli yuborildi`)
            setSelectedIds(new Set())
            await loadOverdue()
        } catch (err) {
            toast.error(err.response?.data?.message || 'SMS yuborishda xatolik')
        } finally {
            setSendingSms(false)
        }
    }

    const handleSendSmsSingle = async (e, customerId) => {
        e.stopPropagation()
        setSendingSms(true)

        try {
            await debtsApi.sendOverdueSms([customerId])
            toast.success('SMS muvaffaqiyatli yuborildi')
            await loadOverdue()
        } catch (err) {
            toast.error(err.response?.data?.message || 'SMS yuborishda xatolik')
        } finally {
            setSendingSms(false)
        }
    }
    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const dd = String(date.getDate()).padStart(2, '0')
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const yyyy = date.getFullYear()
        return `${dd}.${mm}.${yyyy}`
    }

    const formatDateTime = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const dd = String(date.getDate()).padStart(2, '0')
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const yyyy = date.getFullYear()
        const hh = String(date.getHours()).padStart(2, '0')
        const min = String(date.getMinutes()).padStart(2, '0')
        return `${dd}.${mm}.${yyyy} ${hh}:${min}`
    }

    const DAY_OPTIONS = [5, 7, 10, 15, 20, 30, 60, 90]

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                >
                    <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
                <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">
                    Muddati o'tganlar
                </h1>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] text-gray-500 dark:text-gray-400">Kundan:</span>
                    <div className="relative">
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="input text-[14px] pr-8 appearance-none bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 rounded-xl"
                        >
                            {DAY_OPTIONS.map(d => (
                                <option key={d} value={d}>{d} kun</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <button
                    onClick={() => setOrder(o => o === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-[13px] text-gray-700 dark:text-gray-300"
                >
                    <ArrowUpDown size={14} />
                    {order === 'asc' ? 'Eng uzoq ↑' : 'Eng yaqin ↓'}
                </button>
            </div>

            {/* SMS actions */}
            {selectedIds.size > 0 && (
                <div className="mb-4 p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                    <span className="text-[14px] text-blue-700 dark:text-blue-300 font-medium">
                        {selectedIds.size} ta tanlandi
                    </span>
                    <button
                        onClick={handleSendSms}
                        disabled={sendingSms}
                        className="btn btn-primary text-[13px] py-2 px-4 flex items-center gap-1.5"
                    >
                        {sendingSms ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Send size={14} />
                        )}
                        SMS yuborish
                    </button>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <CustomersSkeleton />
            ) : overdueList.length === 0 ? (
                <EmptyState
                    icon={Clock}
                    title="Muddati o'tgan qarzlar yo'q"
                    description={`${days} kundan oshgan ochiq nasiyalar topilmadi`}
                />
            ) : (
                <>
                    {/* Select all */}
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-[13px] text-gray-500 dark:text-gray-400">
                            Jami: <span className="font-semibold text-gray-900 dark:text-white">{overdueList.length}</span> ta mijoz
                        </p>
                        <button
                            onClick={toggleSelectAll}
                            className="text-[13px] text-blue-500 font-medium"
                        >
                            {selectedIds.size === overdueList.length ? 'Bekor qilish' : 'Hammasini tanlash'}
                        </button>
                    </div>

                    {/* Cards */}
                    <div className="space-y-3">
                        {overdueList.map((item, index) => {
                            const isSelected = selectedIds.has(item.customer_id)
                            return (
                                <div
                                    key={item.customer_id}
                                    className={`card dark:bg-gray-800 transition-all ${isSelected ? 'border-2 border-blue-400 dark:border-blue-600' : 'border border-gray-100 dark:border-gray-700'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Checkbox */}
                                        <button
                                            onClick={() => toggleSelect(item.customer_id)}
                                            className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected
                                                ? 'bg-blue-500 border-blue-500 text-white'
                                                : 'border-gray-300 dark:border-gray-600'
                                                }`}
                                        >
                                            {isSelected && <Check size={12} />}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            {/* Name + Phone */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
                                                        <span className="text-gray-400 text-[13px] mr-1.5">#{index + 1}</span>
                                                        {item.name}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <Phone size={12} className="text-gray-400" />
                                                        <a
                                                            href={`tel:${item.phone}`}
                                                            className="text-[13px] text-blue-500"
                                                        >
                                                            {formatPhoneNumber(item.phone)}
                                                        </a>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[16px] font-bold text-red-500">
                                                        {formatCurrency(item.total_remaining)}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400">so'm</p>
                                                </div>
                                            </div>

                                            {/* Details row */}
                                            <div className="flex items-center gap-4 mt-2 flex-wrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={13} className="text-orange-400" />
                                                    <span className="text-[13px] text-gray-600 dark:text-gray-400">
                                                        {formatDate(item.first_debt_date)}
                                                    </span>
                                                </div>
                                                <div className="bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                                                    <span className="text-[12px] font-semibold text-red-600 dark:text-red-400">
                                                        {item.days_overdue} kun
                                                    </span>
                                                </div>
                                                {(item.overdue_sms_count > 0) && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MessageSquare size={13} className="text-green-500" />
                                                        <span className="text-[12px] text-gray-500 dark:text-gray-400">
                                                            {item.overdue_sms_count} ta
                                                            {item.overdue_sms_last_sent_at && (
                                                                <span className="ml-1 text-[11px]">
                                                                    ({formatDateTime(item.overdue_sms_last_sent_at)})
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action icons row */}
                                            <div className="flex items-center gap-2 mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                                                <button
                                                    onClick={() => navigate(`/customers/${item.customer_id}`)}
                                                    className="flex-1 flex justify-center items-center py-2 px-3 bg-gray-100/50 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm font-medium border border-gray-200 dark:border-gray-700"
                                                >
                                                    <span className="mr-1.5">👁</span> Ko'rish
                                                </button>
                                                <button
                                                    onClick={(e) => handleSendSmsSingle(e, item.customer_id)}
                                                    disabled={sendingSms}
                                                    className="flex-1 flex justify-center items-center py-2 px-3 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 rounded-lg transition-colors text-sm font-medium border border-green-200 dark:border-green-800 disabled:opacity-50"
                                                >
                                                    <Send size={15} className="mr-1.5" /> SMS
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}
