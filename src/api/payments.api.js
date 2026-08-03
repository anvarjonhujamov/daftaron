import api from './axios'

export const paymentsApi = {
    getPayments: async (params = {}) => {
        const response = await api.get('/payments', { params })
        return response.data
    },

    createPayment: async (data) => {
        const payload = {
            amount: data.amount,
            paid_at: data.paid_at || null
        }

        if (data.debt_id != null) {
            payload.debt_id = data.debt_id
        }

        if (data.customer_id != null) {
            payload.customer_id = data.customer_id
        }

        if (typeof data.send_sms === 'boolean') {
            payload.send_sms = data.send_sms
        }

        if (data.description != null) {
            payload.description = data.description
        }

        const response = await api.post('/payments', payload)
        return response.data
    }
}

export default paymentsApi
