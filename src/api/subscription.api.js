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

    /**
     * POST /subscription/choose/{plan}
     * planId: number|string – plan identifier in path.
     * Returns: { message, trial_ends_at, balance, ... } per OpenAPI.
     */
    choosePlan: async (planId) => {
        const response = await api.post(`/subscription/choose/${planId}`)
        return response.data
    }
}

export default subscriptionApi

