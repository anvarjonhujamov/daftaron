import api from './axios'

/**
 * Auth API — matches OpenAPI spec.
 * Login: phone + password → token (or requires_verification, then use verify with type=login).
 * Register: (1) name + phone → registerStep1 → (2) verify with type=register → (3) registerComplete with shop + password.
 */
export const authApi = {
    login: async (phone, password, device_name = 'web') => {
        const response = await api.post('/auth/login', { phone, password, device_name })
        return response.data
    },

    registerStep1: async (name, phone, device_name = 'web') => {
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
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        return response.data
    },

    // Password reset flow (3 steps)
    forgotPassword: async (phone) => {
        const response = await api.post('/auth/password/forgot', { phone })
        return response.data
    },

    verifyPasswordReset: async (phone, code) => {
        const response = await api.post('/auth/password/verify', { phone, code })
        return response.data
    },

    resetPassword: async (reset_token, password, password_confirmation) => {
        const response = await api.post('/auth/password/reset', {
            reset_token, password, password_confirmation
        })
        return response.data
    },

    // Tenants (shops)
    createTenant: async (data) => {
        const response = await api.post('/tenants', data)
        return response.data
    }
}

export default authApi
