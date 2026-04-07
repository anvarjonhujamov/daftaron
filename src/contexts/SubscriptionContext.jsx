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

        const usage = data.usage || {}
        const debtLimit = data.total_limit ?? data.total ?? trial.total_limit ?? trial.total ?? usage.debt_limit
        const smsLimit = usage.sms_limit
        const isUnlimitedDebt = debtLimit === 0
        const isUnlimitedSms = smsLimit === 0

        setSubscription(prev => ({
            ...prev,
            status: data.subscription_status || data.status || trial.status || prev.status,
            remaining: isUnlimitedDebt
                ? null
                : (data.remaining_limit ?? data.remaining ?? trial.remaining_limit ?? trial.remaining ?? usage.debt_remaining ?? (usage.debt_limit !== undefined ? Math.max(0, usage.debt_limit - usage.debt_used) : prev.remaining)),
            total: isUnlimitedDebt ? null : (debtLimit ?? prev.total),
            sms_remaining: isUnlimitedSms
                ? null
                : (data.remaining_sms ?? data.sms_remaining ?? trial.remaining_sms ?? trial.sms_remaining ?? usage.sms_remaining ?? (usage.sms_limit !== undefined ? Math.max(0, usage.sms_limit - usage.sms_used) : prev.sms_remaining)),
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
