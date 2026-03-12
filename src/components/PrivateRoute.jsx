import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { subscriptionApi } from '../api/subscription.api'
import { authApi } from '../api/auth.api'
import { SubscriptionContext } from '../contexts/SubscriptionContext'
import { AppLoadingSkeleton } from './Skeleton'

export default function PrivateRoute({ children }) {
    const token = localStorage.getItem('token')
    const location = useLocation()
    const navigate = useNavigate()
    const [checking, setChecking] = useState(!!token)
    const [blocked, setBlocked] = useState(false)
    const hasChecked = useRef(false)

    const checkSubscription = useCallback(async () => {
        if (!token) return
        try {
            // 1) Token ni tekshirish
            try {
                const meData = await authApi.me()
                if (meData?.user || meData?.id || meData?.name) {
                    localStorage.setItem('user', JSON.stringify(meData.user || meData))
                }
            } catch (meErr) {
                if (meErr.response?.status === 401) {
                    // Token eskirgan
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    window.location.href = '/login'
                    return
                }
                // 403 kelsa — trial expired, lekin davom etamiz subscription tekshirish uchun
            }

            // 2) Subscription holatini tekshirish
            const data = await subscriptionApi.getStatus()
            const trial = data.trial_info || data.trial || {}
            const isBlocked = !!(trial.is_expired || trial.status === 0)

            setBlocked(isBlocked)

            // Agar blocked — faqat subscription va profile ga ruxsat
            const allowedWhenBlocked = ['/subscription', '/profile']
            if (isBlocked && !allowedWhenBlocked.includes(window.location.pathname)) {
                navigate('/subscription', { replace: true })
            }
        } catch (err) {
            console.error('Subscription check failed:', err)
        } finally {
            setChecking(false)
        }
    }, [token, navigate])

    useEffect(() => {
        if (!token || hasChecked.current) return
        hasChecked.current = true
        checkSubscription()
    }, [token, checkSubscription])

    const recheckSubscription = useCallback(async () => {
        setChecking(true)
        hasChecked.current = false
        await checkSubscription()
    }, [checkSubscription])

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    const allowedWhenChecking = ['/subscription', '/profile']
    if (checking && !allowedWhenChecking.includes(location.pathname)) {
        return <AppLoadingSkeleton />
    }

    const allowedWhenBlocked = ['/subscription', '/profile']
    if (blocked && !allowedWhenBlocked.includes(location.pathname)) {
        return <Navigate to="/subscription" replace />
    }

    return (
        <SubscriptionContext.Provider value={{ blocked, recheckSubscription }}>
            {children}
        </SubscriptionContext.Provider>
    )
}
