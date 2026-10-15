import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback, useRef } from 'react'
import { subscriptionApi } from '../api/subscription.api'
import { authApi } from '../api/auth.api'
import { SubscriptionContext, readSubscriptionCache } from '../contexts/SubscriptionContext'
import { useContext } from 'react'
import { AppLoadingSkeleton } from './Skeleton'

export default function PrivateRoute({ children }) {
    const { updateSubscriptionData, blocked } = useContext(SubscriptionContext)
    const token = localStorage.getItem('token')
    const location = useLocation()
    const navigate = useNavigate()
    // Keshlangan obuna holati bo'lsa sahifani darhol ko'rsatamiz, tekshiruv fonda ketadi
    const [checking, setChecking] = useState(() => !!token && !readSubscriptionCache())
    const hasChecked = useRef(false)

    const checkSubscription = useCallback(async () => {
        if (!token) return
        try {
            // Token va obuna holati parallel tekshiriladi (401 ni axios interceptor /login ga yo'naltiradi)
            const [meRes, statusRes] = await Promise.allSettled([
                authApi.me(),
                subscriptionApi.getStatus()
            ])

            if (meRes.status === 'fulfilled') {
                const meData = meRes.value
                if (meData?.user || meData?.id || meData?.name) {
                    localStorage.setItem('user', JSON.stringify(meData.user || meData))
                }
            } else if (meRes.reason?.response?.status === 401) {
                return
            }

            if (statusRes.status === 'fulfilled' && updateSubscriptionData) {
                updateSubscriptionData(statusRes.value, { cache: true })
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
