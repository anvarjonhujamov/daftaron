import api from './axios'

export const notificationsApi = {
    getNotifications: async (params = {}) => {
        const response = await api.get('/notifications', { params })
        return response.data
    },

    getNotification: async (id) => {
        const response = await api.get(`/notifications/${id}`)
        return response.data
    }
}

export default notificationsApi
