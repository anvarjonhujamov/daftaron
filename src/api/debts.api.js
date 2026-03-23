import api from './axios'

export const debtsApi = {
    getDebts: async (params = {}) => {
        const response = await api.get('/debts', { params })
        return response.data
    },

    getDebt: async (id) => {
        const response = await api.get(`/debts/${id}`)
        return response.data
    },

    createDebt: async (data) => {
        const payload = {
            customer_id: data.customer_id,
            total_amount: data.total_amount,
            description: data.description || null
        }

        // TZ va OpenAPI bo'yicha ixtiyoriy sana (debt_date) va SMS yuborish flagi (send_sms)
        if (data.debt_date) {
            payload.debt_date = data.debt_date
        }
        if (typeof data.send_sms === 'boolean') {
            payload.send_sms = data.send_sms
        }

        const response = await api.post('/debts', payload)
        return response.data
    },

    updateDebt: async (id, data) => {
        const response = await api.put(`/debts/${id}`, data)
        return response.data
    },

    deleteDebt: async (id) => {
        const response = await api.delete(`/debts/${id}`)
        return response.data
    },

    closeDebt: async (id) => {
        const response = await api.patch(`/debts/${id}/close`)
        return response.data
    },

    getOverdue: async (params = {}) => {
        const response = await api.get('/debts/overdue', { params })
        return response.data
    },

    sendOverdueSms: async (customerIds) => {
        // As per backend convention, passing selected IDs to send targeted SMS
        const response = await api.patch('/debts/send-sms', { customer_ids: customerIds })
        return response.data
    }
}

export default debtsApi
