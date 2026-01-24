import api from './axios'

export const profileApi = {
    getProfile: async () => {
        const response = await api.get('/profile')
        return response.data
    },

    updateProfile: async (data) => {
        const response = await api.put('/profile', {
            name: data.name,
            phone: data.phone,
            email: data.email || null
        })
        return response.data
    },

    updatePassword: async (data) => {
        const response = await api.put('/profile/password', {
            current_password: data.current_password,
            password: data.password,
            password_confirmation: data.password_confirmation
        })
        return response.data
    }
}

export default profileApi
