import api from './axios'

export const authApi = {
    // Backend expects 'phone' field based on actual validation error
    login: async (phone, password, device_name = 'web') => {
        const response = await api.post('/auth/login', { phone, password, device_name })
        return response.data
    },

    register: async (data) => {
        const response = await api.post('/auth/register', {
            name: data.name,
            phone: data.phone,
            email: data.email || null,
            password: data.password,
            password_confirmation: data.password_confirmation,
            shop_name: data.shop_name,
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
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        return response.data
    }
}

export default authApi
