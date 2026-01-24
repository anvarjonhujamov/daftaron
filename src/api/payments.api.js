import api from './axios'

export const paymentsApi = {
    getPayments: async (params = {}) => {
        const response = await api.get('/payments', { params })
        return response.data
    },

    createPayment: async (data) => {
        const response = await api.post('/payments', {
            debt_id: data.debt_id,
            amount: data.amount,
            paid_at: data.paid_at || null
        })
        return response.data
    }
}

export default paymentsApi
