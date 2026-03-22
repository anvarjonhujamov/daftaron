import { useContext, useState, useCallback, useEffect } from 'react'
import { setSubscriptionListener } from '../api/axios'
import { SubscriptionContext } from './SubscriptionContextObject'

export function SubscriptionProvider({ children }) {
    const [subscription, setSubscription] = useState({
        status: 'active',
        remaining: 0,
        total: 50
    })

    const updateSubscriptionData = useCallback((data) => {
        if (!data) return
        
        setSubscription(prev => ({
            ...prev,
            status: data.subscription_status || data.status || prev.status,
            remaining: data.remaining_limit ?? data.remaining ?? prev.remaining ?? 0,
            total: data.total_limit ?? data.total ?? prev.total ?? 50
        }))
    }, [])

    useEffect(() => {
        setSubscriptionListener(updateSubscriptionData)
        return () => setSubscriptionListener(null)
    }, [updateSubscriptionData])

    return (
        <SubscriptionContext.Provider value={{ ...subscription, updateSubscriptionData }}>
            {children}
        </SubscriptionContext.Provider>
    )
}

export function useSubscription() {
    return useContext(SubscriptionContext)
}
