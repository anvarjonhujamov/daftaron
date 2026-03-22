import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { setSubscriptionListener } from '../api/axios'

export const SubscriptionContext = createContext({
    status: 'active', // 'active' | 'expired'
    remaining: null,
    total: null,
    updateSubscriptionData: () => { },
    recheckSubscription: async () => { }
})

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

    const recheckSubscription = useCallback(async () => {
        // This will be populated or handled by PrivateRoute usually, 
        // but we can trigger a manual fetch from subscriptionApi here if we want global sync
        try {
            const { subscriptionApi } = await import('../api/subscription.api')
            const data = await subscriptionApi.getStatus()
            updateSubscriptionData(data)
        } catch (err) {
            console.error('Failed to recheck subscription:', err)
        }
    }, [updateSubscriptionData])

    useEffect(() => {
        setSubscriptionListener(updateSubscriptionData)
        return () => setSubscriptionListener(null)
    }, [updateSubscriptionData])

    return (
        <SubscriptionContext.Provider value={{ ...subscription, updateSubscriptionData, recheckSubscription }}>
            {children}
        </SubscriptionContext.Provider>
    )
}

export function useSubscription() {
    return useContext(SubscriptionContext)
}
