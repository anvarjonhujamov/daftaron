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

        // TZ va OpenAPI bo'yicha ixtiyoriy fieldlar
        if (data.debt_date) {
            payload.debt_date = data.debt_date
        }
        // Yangi: Qaytarish sanasi (return_date) - overdue SMS uchun
        if (data.return_date) {
            payload.return_date = data.return_date
        }
        if (typeof data.send_sms === 'boolean') {
            payload.send_sms = data.send_sms
        }
        // Eski mijozlarga yo'naltirilgan moslik
        if (data.due_date && !data.return_date) {
            payload.return_date = data.due_date
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

    sendOverdueSms: async (customerId, days = 10) => {
        const response = await api.post(`/debts/overdue/${customerId}/send-sms`, null, {
            params: { days }
        })
        return response.data
    },

    // Yangi: return_date kelgan nasiyaga SMS yuborish
    sendReturnDateSms: async (debtId) => {
        const response = await api.post(`/debts/${debtId}/send-return-sms`)
        return response.data
    },

    // Yangi: Biriktirilgan SMS statusini olish (yuborildi / yuborilmadi / limit tugadi)
    getDebtSmsStatus: async (debtId) => {
        const response = await api.get(`/debts/${debtId}/sms-status`)
        return response.data
    }
}

export default debtsApi
