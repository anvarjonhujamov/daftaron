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
        // Try PUT first (as per openapi.yaml/TZ). If server rejects (405), fall back to PATCH or POST so the app works
        try {
            const response = await axios.put(`/tenants/${tenantId}`, data)
            return response.data
        } catch (err) {
            const status = err?.response?.status
            // If method not allowed, try PATCH then POST
            if (status === 405 || status === 404 || status === 400) {
                try {
                    const respPatch = await axios.patch(`/tenants/${tenantId}`, data)
                    return respPatch.data
                } catch (err2) {
                    try {
                        const respPost = await axios.post(`/tenants/${tenantId}`, data)
                        return respPost.data
                    } catch (err3) {
                        throw err3
                    }
                }
            }
            throw err
        }
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
