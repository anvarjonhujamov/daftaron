import api from './axios'

const unwrapPayment = (resp) => resp?.payment || resp?.data || resp

export const paymentsApi = {
    getPayments: async (params = {}) => {
        const response = await api.get('/payments', { params })
        return Array.isArray(response.data) ? response.data : (response.data?.data || response.data || [])
    },

    createPayment: async (data) => {
        const payload = {
            customer_id: data.customer_id ? (Number(data.customer_id) || data.customer_id) : undefined,
            debt_id: data.debt_id ? (Number(data.debt_id) || data.debt_id) : (data.debt_id === 0 ? 0 : null),
            amount: data.amount,
            paid_at: data.paid_at || null
        }

        if (typeof data.send_sms === 'boolean') {
            payload.send_sms = data.send_sms
        }
        if (typeof data.description === 'string' && data.description.trim()) {
            payload.description = data.description.trim()
        }
        if (typeof data.payment_type === 'string' && data.payment_type) {
            payload.payment_type = data.payment_type
        }

        let response
        try {
            response = await api.post('/payments', payload)
        } catch (err) {
            if ([405, 404].includes(err?.response?.status)) {
                response = await api.patch('/payments', payload)
            } else {
                throw err
            }
        }
        return unwrapPayment(response.data)
    },

    updatePayment: async (id, data) => {
        const payload = { ...data }
        let response
        try {
            response = await api.put(`/payments/${id}`, payload)
        } catch (err) {
            if ([405, 404].includes(err?.response?.status)) {
                response = await api.patch(`/payments/${id}`, payload)
            } else {
                throw err
            }
        }
        return unwrapPayment(response.data)
    },

    deletePayment: async (id) => {
        try {
            const response = await api.delete(`/payments/${id}`)
            return response.data
        } catch (err) {
            if ([405, 404].includes(err?.response?.status)) {
                const response = await api.post(`/payments/${id}`, { _method: 'delete' })
                return response.data
            }
            throw err
        }
    }
}

export default paymentsApi
