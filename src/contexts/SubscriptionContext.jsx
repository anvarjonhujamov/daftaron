import { createContext, useContext } from 'react'

export const SubscriptionContext = createContext({ blocked: false })

export function useSubscription() {
    return useContext(SubscriptionContext)
}
