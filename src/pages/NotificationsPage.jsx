import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '../api/notifications.api'
import LoadingSpinner from '../components/LoadingSpinner'
import { CustomersSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { ArrowLeft, Bell, CreditCard, ShoppingBag, Wallet, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '../utils/format'

const NOTIF_ICONS = {
    debt_created: { icon: ShoppingBag, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    debt_payment: { icon: CreditCard, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    balance_topped_up: { icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    subscription_purchased: { icon: ShoppingBag, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    default: { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' }
}

function getNotifMeta(n) {
    const dataType = n.data?.type || ''
    return NOTIF_ICONS[dataType] || NOTIF_ICONS.default
}

export default function NotificationsPage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [notifications, setNotifications] = useState([])
    const [error, setError] = useState('')
    const [expandedId, setExpandedId] = useState(null)
    const [readingId, setReadingId] = useState(null)

    useEffect(() => {
        loadNotifications()
    }, [])

    const loadNotifications = async () => {
        setLoading(true)
        try {
            const data = await notificationsApi.getNotifications()
            setNotifications(Array.isArray(data) ? data : (data.data || []))
        } catch (err) {
            setError(err.response?.data?.message || 'Bildirishnomalarni yuklashda xatolik')
        } finally {
            setLoading(false)
        }
    }

    const handleView = async (n) => {
        if (expandedId === n.id) {
            setExpandedId(null)
            return
        }
        setExpandedId(n.id)

        // Mark as read by viewing detail
        if (!n.read_at) {
            setReadingId(n.id)
            try {
                await notificationsApi.getNotification(n.id)
                setNotifications(prev =>
                    prev.map(item => item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item)
                )
            } catch {
                // ignore
            } finally {
                setReadingId(null)
            }
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const dd = String(date.getDate()).padStart(2, '0')
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const yyyy = date.getFullYear()
        const hh = String(date.getHours()).padStart(2, '0')
        const min = String(date.getMinutes()).padStart(2, '0')
        return `${dd}.${mm}.${yyyy} ${hh}:${min}`
    }

    const formatRelativeTime = (dateString) => {
        if (!dateString) return ''
        const now = new Date()
        const date = new Date(dateString)
        const diffMs = now - date
        const diffMin = Math.floor(diffMs / 60000)
        const diffHrs = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMin < 1) return 'Hozirgina'
        if (diffMin < 60) return `${diffMin} daqiqa oldin`
        if (diffHrs < 24) return `${diffHrs} soat oldin`
        if (diffDays < 7) return `${diffDays} kun oldin`
        return formatDate(dateString)
    }

    const unreadCount = notifications.filter(n => !n.read_at).length

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
            <div className="flex items-center gap-3 mb-5">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                >
                    <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
                <h1 className="text-[22px] font-bold text-gray-900 dark:text-white flex-1">
                    Bildirishnomalar
                </h1>
                {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[12px] font-bold px-2.5 py-0.5 rounded-full">
                        {unreadCount}
                    </span>
                )}
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-2xl text-[14px] bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                </div>
            )}

            {loading ? (
                <CustomersSkeleton />
            ) : notifications.length === 0 ? (
                <EmptyState
                    icon={Bell}
                    title="Bildirishnomalar yo'q"
                    description="Yangi bildirishnomalar bu yerda ko'rinadi"
                />
            ) : (
                <div className="space-y-2">
                    {notifications.map((n) => {
                        const meta = getNotifMeta(n)
                        const Icon = meta.icon
                        const isExpanded = expandedId === n.id
                        const isUnread = !n.read_at

                        return (
                            <div
                                key={n.id}
                                className={`card dark:bg-gray-800 transition-all ${isUnread ? 'border-l-4 border-blue-500' : ''}`}
                            >
                                <button
                                    onClick={() => handleView(n)}
                                    className="w-full flex items-center gap-3 text-left"
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                                        <Icon size={18} className={meta.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-[14px] line-clamp-1 ${isUnread ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                            {n.data?.message || 'Bildirishnoma'}
                                        </p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            {formatRelativeTime(n.created_at)}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-gray-300">
                                        {readingId === n.id ? (
                                            <LoadingSpinner size="sm" />
                                        ) : isExpanded ? (
                                            <ChevronUp size={16} />
                                        ) : (
                                            <ChevronDown size={16} />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <p className="text-[14px] text-gray-700 dark:text-gray-300 mb-2">
                                            {n.data?.message || 'Bildirishnoma'}
                                        </p>

                                        {/* Detail data */}
                                        <div className="space-y-1 text-[13px] text-gray-500 dark:text-gray-400">
                                            {n.data?.customer_name && (
                                                <p>Mijoz: <span className="font-medium text-gray-700 dark:text-gray-300">{n.data.customer_name}</span></p>
                                            )}
                                            {n.data?.tenant_name && (
                                                <p>Do'kon: <span className="font-medium text-gray-700 dark:text-gray-300">{n.data.tenant_name}</span></p>
                                            )}
                                            {n.data?.amount && (
                                                <p>Summa: <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(n.data.amount)} so'm</span></p>
                                            )}
                                            {n.data?.plan_name && (
                                                <p>Ta'rif: <span className="font-medium text-gray-700 dark:text-gray-300">{n.data.plan_name}</span></p>
                                            )}
                                            {n.data?.source && (
                                                <p>Manba: <span className="font-medium text-gray-700 dark:text-gray-300">{n.data.source}</span></p>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-gray-400 mt-2">
                                            {formatDate(n.created_at)}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
