import axios from './axios'

export const tenantsApi = {
    getTenants: async () => {
        const response = await axios.get('/tenants')
        return response.data
    },

    createTenant: async (data) => {
        const response = await axios.post('/tenants', data)
        return response.data
    },

    updateTenant: async (tenantId, data) => {
        const response = await axios.put(`/tenants/${tenantId}`, data)
        return response.data
    },

    setActiveTenant: async (tenantId) => {
        const response = await axios.put('/tenants/active', { tenant_id: tenantId })
        return response.data
    },

    deleteTenant: async (tenantId) => {
        const response = await axios.delete(`/tenants/${tenantId}`)
        return response.data
    }
}
