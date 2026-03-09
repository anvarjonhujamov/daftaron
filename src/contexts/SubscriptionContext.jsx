import { createContext, useContext } from 'react'

export const SubscriptionContext = createContext({
    blocked: false,
    recheckSubscription: () => { }
})

export function useSubscription() {
    return useContext(SubscriptionContext)
}
