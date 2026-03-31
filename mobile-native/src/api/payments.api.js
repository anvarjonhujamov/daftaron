import api from './client'

export const paymentsApi = {
  getPayments: async (params = {}) => {
    const response = await api.get('/payments', { params })
    return response.data
  },

  createPayment: async (data) => {
    const payload = {
      debt_id: data.debt_id,
      amount: data.amount,
      paid_at: data.paid_at || null
    }

    if (typeof data.send_sms === 'boolean') {
      payload.send_sms = data.send_sms
    }

    const response = await api.post('/payments', payload)
    return response.data
  }
}

export default paymentsApi
