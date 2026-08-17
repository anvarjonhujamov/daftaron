import api from './client'

export const authApi = {
  login: async (phone, password, device_name = 'mobile') => {
    const response = await api.post('/auth/login', { phone, password, device_name })
    return response.data
  },

  registerStep1: async (name, phone, device_name = 'mobile') => {
    const response = await api.post('/auth/register', { name, phone, device_name })
    return response.data
  },

  verify: async (phone, code, type) => {
    const response = await api.post('/auth/verify', { phone, code, type })
    return response.data
  },

  registerPassword: async (phone, password, password_confirmation) => {
    const response = await api.post('/auth/register/password', {
      phone,
      password,
      password_confirmation
    })
    return response.data
  },

  registerComplete: async (data) => {
    const response = await api.post('/auth/register/complete', {
      phone: data.phone,
      shop_name: data.shop_name,
      category_id: data.category_id,
      region_id: data.region_id,
      district_id: data.district_id,
      street_id: data.street_id
    })
    return response.data
  },

  me: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },

  logout: async () => {
    const response = await api.post('/auth/logout')
    return response.data
  }
}

export default authApi
