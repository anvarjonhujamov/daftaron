import api from './client'

export const dashboardApi = {
  getStats: async () => {
    const response = await api.get('/dashboard')
    return response.data
  }
}

export default dashboardApi
