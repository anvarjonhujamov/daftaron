import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { subscriptionApi } from '../api/subscription.api'

export default function PrivateRoute({ children }) {
    const token = localStorage.getItem('token')
    const location = useLocation()
    const navigate = useNavigate()
    const [checking, setChecking] = useState(!!token)

    useEffect(() => {
        if (!token) return

        let cancelled = false

        const checkSubscription = async () => {
            try {
                const data = await subscriptionApi.getStatus()
                const trial = data.trial_info || data.trial || {}

                if (cancelled) return

                // Agar trial tugagan yoki hisob bloklangan bo'lsa — obuna sahifasiga yo'naltiramiz
                if ((trial.is_expired || trial.status === 0) && location.pathname !== '/subscription') {
                    navigate('/subscription', { replace: true })
                }
            } catch (err) {
                // 401 holatini axios interceptori hal qiladi (login sahifasiga qaytaradi)
                console.error('Subscription check failed:', err)
            } finally {
                if (!cancelled) {
                    setChecking(false)
                }
            }
        }

        checkSubscription()

        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token])

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    if (checking && location.pathname !== '/subscription') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-gray-500 dark:text-gray-400 text-sm">Yuklanmoqda...</div>
            </div>
        )
    }

    return children
}
