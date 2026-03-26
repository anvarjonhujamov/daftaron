import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { subscriptionApi } from '../api/subscription.api'
import { authApi } from '../api/auth.api'
import { SubscriptionContext } from '../contexts/SubscriptionContext'
import { useContext } from 'react'
import { AppLoadingSkeleton } from './Skeleton'

export default function PrivateRoute({ children }) {
    const { updateSubscriptionData, blocked } = useContext(SubscriptionContext)
    const token = localStorage.getItem('token')
    const location = useLocation()
    const navigate = useNavigate()
    const [checking, setChecking] = useState(!!token)
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
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    window.location.href = '/login'
                    return
                }
            }

            // 2) Subscription holatini tekshirish
            const data = await subscriptionApi.getStatus()

            if (updateSubscriptionData) {
                updateSubscriptionData(data)
            }
        } catch (err) {
            console.error('Subscription check failed:', err)
        } finally {
            setChecking(false)
        }
    }, [token, updateSubscriptionData])

    useEffect(() => {
        if (!token || hasChecked.current) return
        hasChecked.current = true
        checkSubscription()
    }, [token, checkSubscription])

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    const allowedWhenBlocked = ['/subscription', '/profile']
    if (checking && !allowedWhenBlocked.includes(location.pathname)) {
        return <AppLoadingSkeleton />
    }

    // Obunasiz user faqat subscription va profile sahifalariga kira oladi
    if (blocked && !allowedWhenBlocked.includes(location.pathname)) {
        return <Navigate to="/subscription" replace />
    }

    return children
}
