import api from './client'

export const subscriptionApi = {
  getStatus: async () => {
    const response = await api.get('/subscription/status')
    return response.data
  }
}

export default subscriptionApi
