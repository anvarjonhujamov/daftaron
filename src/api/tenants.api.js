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
        // Prefer PATCH for partial updates; try PATCH, then PUT. If server returns allowed methods header, honor it.
        try {
            const respPatch = await axios.patch(`/tenants/${tenantId}`, data)
            return respPatch.data
        } catch (err) {
            const status = err?.response?.status
            const allowHeader = err?.response?.headers?.allow || err?.response?.headers?.Allow || ''
            const allowed = String(allowHeader || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)

            // If server explicitly allows PUT, try it
            if (allowed.includes('PUT')) {
                const respPut = await axios.put(`/tenants/${tenantId}`, data)
                return respPut.data
            }

            // If initial PATCH failed but server didn't specify allowed methods, try PUT as a fallback
            if (status === 405 || status === 404 || status === 400 || allowed.length === 0) {
                try {
                    const respPut = await axios.put(`/tenants/${tenantId}`, data)
                    return respPut.data
                } catch (err2) {
                    const allow2 = err2?.response?.headers?.allow || err2?.response?.headers?.Allow || ''
                    const allowed2 = String(allow2 || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
                    if (allowed2.length === 0) {
                        // No allowed update methods found — surface helpful error to user
                        const message = err2?.response?.data?.message || `Server does not support update on /tenants/${tenantId}. Allowed methods: ${allow2 || 'none'}`
                        const error = new Error(message)
                        error.original = err2
                        error.allowedMethods = allowed2
                        throw error
                    }
                    throw err2
                }
            }

            // If PATCH failed and server explicitly disallows PUT/PATCH, give informative error
            const message = err?.response?.data?.message || `Server does not support PATCH/PUT on /tenants/${tenantId}. Allowed methods: ${allowHeader || 'none'}`
            const error = new Error(message)
            error.original = err
            error.allowedMethods = allowed
            throw error
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
