import api from './client'

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

    if (data.debt_date) payload.debt_date = data.debt_date
    if (typeof data.send_sms === 'boolean') payload.send_sms = data.send_sms

    const response = await api.post('/debts', payload)
    return response.data
  },

  closeDebt: async (id) => {
    const response = await api.patch(`/debts/${id}/close`)
    return response.data
  }
}

export default debtsApi
