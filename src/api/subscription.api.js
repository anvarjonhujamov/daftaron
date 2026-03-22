import api from './axios'

/**
 * Subscription API — `/subscription/status` and `/subscription/choose/{plan}`
 * Matches TZ.md & UserFlow-Mobile.md.
 */
export const subscriptionApi = {
    /**
     * GET /subscription/status
     * Returns: { balance, trial_info, plans, transactions }
     */
    getStatus: async () => {
        const response = await api.get('/subscription/status')
        return response.data
    },

    choosePlan: async (planId) => {
        const response = await api.post(`/subscription/choose/${planId}`)
        return response.data
    },

    /**
     * POST /subscription/buy-extra/{packageId}
     * Returns: { message, balance, ... }
     */
    buyExtraPackage: async (packageId) => {
        const response = await api.post(`/subscription/buy-extra/${packageId}`)
        return response.data
    }
}

export default subscriptionApi

