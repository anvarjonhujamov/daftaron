import api from './axios'

export const customersApi = {
    /** GET /customers — paginated. Optional query param `q` for search (OpenAPI). */
    getCustomers: async (params = {}) => {
        const response = await api.get('/customers', { params })
        return response.data
    },

    getCustomer: async (id) => {
        const response = await api.get(`/customers/${id}`)
        return response.data
    },

    createCustomer: async (data) => {
        const response = await api.post('/customers', {
            name: data.name,
            phone: data.phone,
            address: data.address || null,
            note: data.note || null,
            region_id: data.region_id || null,
            district_id: data.district_id || null,
            street_id: data.street_id || null
        })
        return response.data
    },

    updateCustomer: async (id, data) => {
        const response = await api.put(`/customers/${id}`, data)
        return response.data
    },

    deleteCustomer: async (id) => {
        const response = await api.delete(`/customers/${id}`)
        return response.data
    }
}

export default customersApi
