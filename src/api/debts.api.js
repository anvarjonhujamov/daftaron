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
        const response = await api.post('/debts', {
            customer_id: data.customer_id,
            total_amount: data.total_amount,
            description: data.description || null
        })
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
    }
}

export default debtsApi
