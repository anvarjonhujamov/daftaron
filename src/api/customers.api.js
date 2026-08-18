import api from './axios'

const unwrapCustomer = (responseData) => {
    if (!responseData || typeof responseData !== 'object') return responseData
    return responseData.customer || responseData.data || responseData
}
const unwrapCustomerList = (responseData) => {
    if (!responseData || typeof responseData !== 'object') return []
    const list = responseData.customers || responseData.data || responseData
    return Array.isArray(list) ? list : []
}

export const customersApi = {
    getCustomers: async (params = {}) => {
        const response = await api.get('/customers', { params })
        return response.data?.data !== undefined
            ? (Array.isArray(response.data.data) ? response.data : { ...response.data, data: response.data.data })
            : response.data
    },

    getCustomer: async (id) => {
        const response = await api.get(`/customers/${id}`)
        return unwrapCustomer(response.data)
    },

    createCustomer: async (data) => {
        const payload = {
            name: data.name,
            phone: data.phone,
            address: data.address || null,
            note: data.note || null,
            region_id: data.region_id ?? null,
            district_id: data.district_id ?? null,
            street_id: data.street_id ?? null
        }
        if (data.region_name !== undefined) payload.region_name = data.region_name || null
        if (data.district_name !== undefined) payload.district_name = data.district_name || null
        if (data.street_name !== undefined) payload.street_name = data.street_name || null
        if (data.location) payload.location = data.location
        if (data.full_address) payload.full_address = data.full_address
        if (data.email) payload.email = data.email || null
        if (data.birth_date) payload.birth_date = data.birth_date || null

        const response = await api.post('/customers', payload)
        return unwrapCustomer(response.data)
    },

    updateCustomer: async (id, data) => {
        const sendRequest = async (method) => {
            const result = await api.request({
                method,
                url: `/customers/${id}`,
                data
            })
            return unwrapCustomer(result.data)
        }

        try {
            return await sendRequest('put')
        } catch (err) {
            const status = err?.response?.status
            if (status === 405 || status === 404) {
                console.warn(`[customersApi.updateCustomer] /customers/${id} PUT ${status}, retry with PATCH`)
                return await sendRequest('patch')
            }
            throw err
        }
    },

    deleteCustomer: async (id) => {
        const sendRequest = async (method) => {
            const result = await api.request({
                method,
                url: `/customers/${id}`
            })
            return result.data
        }

        try {
            return await sendRequest('delete')
        } catch (err) {
            const status = err?.response?.status
            if (status === 405 || status === 404) {
                console.warn(`[customersApi.deleteCustomer] /customers/${id} DELETE ${status}, retry POST/_method=delete`)
                const result = await api.post(`/customers/${id}`, { _method: 'delete' })
                return result.data
            }
            throw err
        }
    }
}

export default customersApi
