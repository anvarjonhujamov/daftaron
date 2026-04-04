import axios from './axios'

export const staffApi = {
    getStaff: async (params = {}) => {
        const response = await axios.get('/workers', { params })
        return response.data
    },

    getStaffById: async (id) => {
        const response = await axios.get(`/workers/${id}`)
        return response.data
    },

    createStaff: async (data) => {
        const response = await axios.post('/workers', data)
        return response.data
    },

    updateStaff: async (id, data) => {
        const response = await axios.put(`/workers/${id}`, data)
        return response.data
    },

    deleteStaff: async (id) => {
        const response = await axios.delete(`/workers/${id}`)
        return response.data
    }
}
