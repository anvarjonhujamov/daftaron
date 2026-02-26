import api from './axios'

/**
 * Auth API — matches OpenAPI spec.
 * Login: phone + password → token (or requires_verification, then use verify with type=login).
 * Register: (1) name + phone → registerStep1 → (2) verify with type=register → (3) registerComplete with shop + password.
 */
export const authApi = {
    /**
     * Login. If SMS verification is disabled, returns token + user.
     * If requires_verification is true, call verify(phone, code, 'login') to get token.
     */
    login: async (phone, password, device_name = 'web') => {
        const response = await api.post('/auth/login', { phone, password, device_name })
        return response.data
    },

    /**
     * Register step 1 — send name and phone only. Data cached 30 min; not saved to DB yet.
     * Returns { message, phone, requires_verification: true }. Then send SMS code to verify.
     */
    registerStep1: async (name, phone, device_name = 'web') => {
        const response = await api.post('/auth/register', { name, phone, device_name })
        return response.data
    },

    /**
     * Verify SMS code. type: 'login' | 'register'.
     * login: returns token + user.
     * register: returns { requires_completion: true, phone }; then call registerComplete.
     */
    verify: async (phone, code, type) => {
        const response = await api.post('/auth/verify', { phone, code, type })
        return response.data
    },

    /**
     * Register step 2 — after verify(type=register). Sends shop + location + password.
     * Phone must be in cache (within 30 min of register + verify). Creates user and tenant, returns token.
     */
    registerComplete: async (data) => {
        const response = await api.post('/auth/register/complete', {
            phone: data.phone,
            shop_name: data.shop_name,
            category_id: data.category_id,
            region_id: data.region_id,
            district_id: data.district_id,
            street_id: data.street_id,
            password: data.password,
            password_confirmation: data.password_confirmation
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
