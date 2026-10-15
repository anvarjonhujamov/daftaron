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

const INITIAL_SUBSCRIPTION = {
    status: 'active',
    remaining: null,
    total: null,
    sms_remaining: null,
    blocked: false
}

// Oxirgi /subscription/status javobi token bilan birga saqlanadi:
// keyingi ochilishda sahifa API ni kutmasdan darhol chiziladi, holat esa fonda yangilanadi
const CACHE_KEY = 'subscription_cache_v1'

export const readSubscriptionCache = () => {
    try {
        const token = localStorage.getItem('token')
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
        return token && cached?.token === token ? cached.data : null
    } catch {
        return null
    }
}

const writeSubscriptionCache = (data) => {
    try {
        const token = localStorage.getItem('token')
        if (token) localStorage.setItem(CACHE_KEY, JSON.stringify({ token, data }))
    } catch { /* ignore */ }
}

const deriveSubscription = (data, prev) => {
    const trial = data.trial_info || data.trial || {}
    const isBlocked = !!(trial.is_expired || trial.status === 0)

    const usage = data.usage || {}
    const debtLimit = data.total_limit ?? data.total ?? trial.total_limit ?? trial.total ?? usage.debt_limit
    const smsLimit = usage.sms_limit
    const isUnlimitedDebt = debtLimit === 0
    const isUnlimitedSms = smsLimit === 0

    return {
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
    }
}

export function SubscriptionProvider({ children }) {
    const [subscription, setSubscription] = useState(() => {
        const cached = readSubscriptionCache()
        return cached ? deriveSubscription(cached, INITIAL_SUBSCRIPTION) : INITIAL_SUBSCRIPTION
    })

    // To'liq /subscription/status javobi (cache=true) yoki axios interceptordan kelgan qisman ma'lumot
    const updateSubscriptionData = useCallback((data, { cache = false } = {}) => {
        if (!data) return
        if (cache) writeSubscriptionCache(data)
        setSubscription(prev => deriveSubscription(data, prev))
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
