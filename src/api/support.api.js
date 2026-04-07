import api from './axios'

export const supportApi = {
    sendMessage: async (message) => {
        const response = await api.post('/support/chat', { message })
        return response.data
    },

    getHistory: async () => {
        const response = await api.get('/support/history')
        return response.data
    },

    clearHistory: async () => {
        const response = await api.delete('/support/history')
        return response.data
    }
}

export default supportApi
