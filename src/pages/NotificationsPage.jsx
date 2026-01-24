import { useState, useEffect } from 'react'
import { notificationsApi } from '../api/notifications.api'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [pagination, setPagination] = useState(null)

    useEffect(() => {
        loadNotifications()
    }, [])

    const loadNotifications = async (page = 1) => {
        setLoading(true)
        try {
            const data = await notificationsApi.getNotifications({ page })
            setNotifications(data.data || [])
            setPagination(data.meta || null)
        } catch (err) {
            console.error('Failed to load notifications:', err)
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 60) return `${diffMins} daqiqa oldin`
        if (diffHours < 24) return `${diffHours} soat oldin`
        if (diffDays < 7) return `${diffDays} kun oldin`

        return date.toLocaleDateString('uz-UZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        )
    }

    return (
        <div className="px-4 py-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Bildirishnomalar</h1>

            {notifications.length === 0 ? (
                <EmptyState
                    icon="🔔"
                    title="Bildirishnomalar yo'q"
                    description="Yangi bildirishnomalar bu yerda ko'rinadi"
                />
            ) : (
                <div className="space-y-3">
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`card ${notification.read_at ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">
                                    {notification.read_at ? '📭' : '📬'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-900">
                                        {notification.data?.title || notification.type || 'Bildirishnoma'}
                                    </div>
                                    {notification.data?.message && (
                                        <p className="text-slate-500 text-sm mt-1">
                                            {notification.data.message}
                                        </p>
                                    )}
                                    <div className="text-xs text-slate-400 mt-2">
                                        {formatDate(notification.created_at)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {pagination && pagination.last_page > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    {pagination.current_page > 1 && (
                        <button
                            onClick={() => loadNotifications(pagination.current_page - 1)}
                            className="btn btn-secondary"
                        >
                            ← Oldingi
                        </button>
                    )}
                    <span className="px-4 py-2 text-slate-600">
                        {pagination.current_page} / {pagination.last_page}
                    </span>
                    {pagination.current_page < pagination.last_page && (
                        <button
                            onClick={() => loadNotifications(pagination.current_page + 1)}
                            className="btn btn-secondary"
                        >
                            Keyingi →
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
