import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { setSubscriptionListener } from '../api/axios'

export const SubscriptionContext = createContext({
    status: 'active', // 'active' | 'expired'
    remaining: null,
    total: null,
    sms_remaining: null,
    blocked: false,
    updateSubscriptionData: () => { }
})

export function SubscriptionProvider({ children }) {
    const [subscription, setSubscription] = useState({
        status: 'active',
        remaining: null,
        total: null,
        sms_remaining: null,
        blocked: false
    })

    const updateSubscriptionData = useCallback((data) => {
        if (!data) return
        
        const trial = data.trial_info || data.trial || {}
        const isBlocked = !!(trial.is_expired || trial.status === 0)

        setSubscription(prev => ({
            ...prev,
            status: data.subscription_status || data.status || trial.status || prev.status,
            remaining: data.remaining_limit ?? data.remaining ?? trial.remaining_limit ?? trial.remaining ?? prev.remaining,
            total: data.total_limit ?? data.total ?? trial.total_limit ?? trial.total ?? prev.total,
            sms_remaining: data.remaining_sms ?? data.sms_remaining ?? trial.remaining_sms ?? trial.sms_remaining ?? prev.sms_remaining,
            blocked: isBlocked
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
