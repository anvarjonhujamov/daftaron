import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { subscriptionApi } from '../api/subscription.api'
import { SubscriptionContext } from '../contexts/SubscriptionContext'

export default function PrivateRoute({ children }) {
    const token = localStorage.getItem('token')
    const location = useLocation()
    const navigate = useNavigate()
    const [checking, setChecking] = useState(!!token)
    const [blocked, setBlocked] = useState(false)

    useEffect(() => {
        if (!token) return

        let cancelled = false

        const checkSubscription = async () => {
            try {
                const data = await subscriptionApi.getStatus()
                const trial = data.trial_info || data.trial || {}
                const isBlocked = !!(trial.is_expired || trial.status === 0)

                if (cancelled) return

                setBlocked(isBlocked)

                // Agar trial tugagan yoki hisob bloklangan bo'lsa — faqat obuna yoki sozlamalar sahifasiga ruxsat
                const allowedWhenBlocked = ['/subscription', '/profile']
                if (isBlocked && !allowedWhenBlocked.includes(location.pathname)) {
                    navigate('/profile', { replace: true })
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

    // Allow both /subscription and /profile pages to load right away without redirect while checking subscription.
    // If not, it flashes incorrectly or gets blocked during load.
    const allowedWhenChecking = ['/subscription', '/profile']
    if (checking && !allowedWhenChecking.includes(location.pathname)) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-gray-500 dark:text-gray-400 text-sm">Yuklanmoqda...</div>
            </div>
        )
    }

    // Obuna tugagan foydalanuvchi faqat obuna va sozlamalar sahifasini ko'ra oladi
    const allowedWhenBlocked = ['/subscription', '/profile']
    if (blocked && !allowedWhenBlocked.includes(location.pathname)) {
        return <Navigate to="/profile" replace />
    }

    return (
        <SubscriptionContext.Provider value={{ blocked }}>
            {children}
        </SubscriptionContext.Provider>
    )
}
