import axios from './axios'

export const tenantsApi = {
    getTenants: async (params = {}) => {
        const { page = 1, perPage = 100 } = params
        const query = new URLSearchParams({
            page: String(page),
            per_page: String(perPage)
        }).toString()

        const response = await axios.get(`/tenants?${query}`)
        const data = response.data?.data || response.data?.tenants || response.data
        return Array.isArray(data) ? data : []
    },

    getTenant: async (tenantId) => {
        const response = await axios.get(`/tenants/${tenantId}`)
        return response.data?.tenant || response.data?.data || response.data
    },

    createTenant: async (data) => {
        const response = await axios.post('/tenants', data)
        return response.data?.tenant || response.data?.data || response.data
    },

    updateTenant: async (tenantId, data) => {
        const sendRequest = async (method) => {
            const result = await axios.request({
                method,
                url: `/tenants/${tenantId}`,
                data
            })
            return result.data?.tenant || result.data?.data || result.data
        }

        try {
            return await sendRequest('put')
        } catch (err) {
            const status = err?.response?.status
            if (status === 405 || status === 404) {
                console.warn(`[tenantsApi.updateTenant] /tenants/${tenantId} PUT failed with ${status}, retrying with PATCH`)
                return await sendRequest('patch')
            }
            throw err
        }
    },

    deleteTenant: async (tenantId) => {
        const sendRequest = async (method) => {
            const result = await axios.request({
                method,
                url: `/tenants/${tenantId}`
            })
            return result.data
        }

        try {
            return await sendRequest('delete')
        } catch (err) {
            const status = err?.response?.status
            if (status === 405 || status === 404) {
                console.warn(`[tenantsApi.deleteTenant] /tenants/${tenantId} DELETE failed with ${status}, trying POST /destroy fallback`)
                const result = await axios.post(`/tenants/${tenantId}`, { _method: 'delete' })
                return result.data
            }
            throw err
        }
    }
}

export default tenantsApi
