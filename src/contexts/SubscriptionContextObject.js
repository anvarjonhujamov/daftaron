import { createContext } from 'react'

export const SubscriptionContext = createContext({
    status: 'active', // 'active' | 'expired'
    remaining: null,
    total: null,
    updateSubscriptionData: () => { }
})
