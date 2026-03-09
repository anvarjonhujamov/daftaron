import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '../api/notifications.api'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { ArrowLeft, Bell, ChevronRight } from 'lucide-react'

export default function NotificationsPage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [notifications, setNotifications] = useState([])
    const [error, setError] = useState('')

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

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const dd = String(date.getDate()).padStart(2, '0')
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const hh = String(date.getHours()).padStart(2, '0')
        const min = String(date.getMinutes()).padStart(2, '0')
        return `${dd}.${mm} ${hh}:${min}`
    }

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
            <div className="flex items-center gap-3 mb-5">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                >
                    <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
                <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">
                    Bildirishnomalar
                </h1>
            </div>

            {error && (
                <div className="mb-4 p-3 rounded-2xl text-[14px] bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <LoadingSpinner size="lg" />
                </div>
            ) : notifications.length === 0 ? (
                <EmptyState
                    icon={Bell}
                    title="Bildirishnomalar yo'q"
                    description="Yangi bildirishnomalar bu yerda ko'rinadi"
                />
            ) : (
                <div className="space-y-2">
                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className={`card dark:bg-gray-800 flex items-center gap-3 ${!n.read_at ? 'border-l-4 border-blue-500' : ''}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!n.read_at ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'
                                }`}>
                                <Bell size={18} className={!n.read_at ? 'text-blue-500' : 'text-gray-400'} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-[14px] ${!n.read_at ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {n.title || n.message || n.data?.message || 'Bildirishnoma'}
                                </p>
                                {n.body && (
                                    <p className="text-[12px] text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                                )}
                                <p className="text-[11px] text-gray-400 mt-1">
                                    {formatDate(n.created_at)}
                                </p>
                            </div>
                            <ChevronRight size={16} className="text-gray-300 shrink-0" />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
