import api from './axios'
const ENDPOINT_CANDIDATES = [
    '/suppliers',
    '/partners',
    '/providers',
    '/deliverers',
    '/vendors',
    '/supplier',
    '/partner'
]

let detectedEndpoint = null

const getEndpoint = async (suffix = '') => {
    const base = detectedEndpoint || ENDPOINT_CANDIDATES[0]
    return `${base}${suffix}`
}

const tryEndpoints = async (method, idSuffix, data, params) => {
    return new Promise(async (resolve, reject) => {
        let lastErr = null
        for (let i = 0; i < ENDPOINT_CANDIDATES.length; i++) {
            const endpointBase = ENDPOINT_CANDIDATES[i]
            try {
                const url = `${endpointBase}${idSuffix}`
                let res
                if (method === 'get') {
                    res = await api.get(url, { params })
                } else if (method === 'post') {
                    res = await api.post(url, data, { params })
                } else if (method === 'put') {
                    res = await api.put(url, data)
                } else if (method === 'patch') {
                    res = await api.patch(url, data)
                } else if (method === 'delete') {
                    res = await api.delete(url)
                }
                if (!detectedEndpoint && i > 0) {
                    console.info(`[suppliersApi] auto-detected endpoint: ${endpointBase}`)
                    detectedEndpoint = endpointBase
                } else if (!detectedEndpoint) {
                    detectedEndpoint = endpointBase
                }
                return resolve(res)
            } catch (err) {
                const status = err?.response?.status
                if (status === 403 || status === 401 || status === 422 || status === 200) {
                    if (!detectedEndpoint) detectedEndpoint = endpointBase
                    return reject(err)
                }
                lastErr = err
            }
        }
        reject(lastErr)
    })
}

const unwrapSupplier = (responseData) => {
    if (!responseData || typeof responseData !== 'object') return responseData
    return responseData.supplier || responseData.partner || responseData.provider || responseData.vendor || responseData.deliverer || responseData.data || responseData
}
const unwrapSupplierList = (responseData) => {
    if (!responseData || typeof responseData !== 'object') return []
    const list = responseData.suppliers || responseData.partners || responseData.providers || responseData.vendors || responseData.deliverers || responseData.data || responseData
    return Array.isArray(list) ? list : []
}

export const suppliersApi = {
    getSuppliers: async (params = {}) => {
        const cleanParams = { ...params }
        if (cleanParams.per_page !== undefined && cleanParams.per_page !== null) {
            delete cleanParams.per_page
        }
        const res = await tryEndpoints('get', '', null, cleanParams)
        const data = res.data || {}
        const list = unwrapSupplierList(data)
        if (Array.isArray(data?.data) || Array.isArray(data)) {
            return {
                data: list,
                meta: data.meta || data.pagination || null,
                total: data.total ?? list.length
            }
        }
        return data
    },

    getSupplier: async (id) => {
        const res = await tryEndpoints('get', `/${id}`)
        return unwrapSupplier(res.data)
    },

    createSupplier: async (data) => {
        const payload = {
            name: data.name,
            company_name: data.company_name || data.name || null,
            phone: data.phone,
            contact_person: data.contact_person || null,
            contact: data.contact || data.contact_person || null,
            manager_name: data.manager_name || data.contact_person || null,
            responsible: data.responsible || data.contact_person || null,
            address: data.address || null,
            inn: data.inn || data.stir || data.tin || null,
            stir: data.stir || data.inn || data.tin || null,
            tin: data.tin || data.inn || data.stir || null,
            note: data.note || null
        }
        if (data.balance !== undefined) payload.balance = data.balance || 0
        if (data.current_debt !== undefined) payload.current_debt = data.current_debt || 0

        const res = await tryEndpoints('post', '', payload)
        return unwrapSupplier(res.data)
    },

    updateSupplier: async (id, data) => {
        const payload = {
            name: data.name,
            company_name: data.company_name || data.name || null,
            phone: data.phone,
            contact_person: data.contact_person || null,
            contact: data.contact || data.contact_person || null,
            manager_name: data.manager_name || data.contact_person || null,
            responsible: data.responsible || data.contact_person || null,
            address: data.address || null,
            inn: data.inn || data.stir || data.tin || null,
            stir: data.stir || data.inn || data.tin || null,
            tin: data.tin || data.inn || data.stir || null,
            note: data.note || null
        }
        if (data.balance !== undefined) payload.balance = data.balance || 0
        if (data.current_debt !== undefined) payload.current_debt = data.current_debt || 0

        const sendRequest = async (method) => {
            const suffix = `/${id}`
            if (method === 'put') return tryEndpoints('put', suffix, payload)
            return tryEndpoints('patch', suffix, payload)
        }

        try {
            const result = await sendRequest('put')
            return unwrapSupplier(result.data)
        } catch (err) {
            const status = err?.response?.status
            if (status === 405 || status === 404) {
                console.warn(`[suppliersApi.updateSupplier] PUT ${status}, retry with PATCH`)
                const r = await sendRequest('patch')
                return unwrapSupplier(r.data)
            }
            throw err
        }
    },

    deleteSupplier: async (id) => {
        const sendRequest = async (method) => {
            const suffix = `/${id}`
            if (method === 'delete') return tryEndpoints('delete', suffix)
            return tryEndpoints('post', suffix, { _method: 'delete' })
        }

        try {
            const r = await sendRequest('delete')
            return r.data
        } catch (err) {
            const status = err?.response?.status
            if (status === 405 || status === 404) {
                console.warn(`[suppliersApi.deleteSupplier] DELETE ${status}, retry POST/_method=delete`)
                const r = await sendRequest('fallback')
                return r.data
            }
            throw err
        }
    },

    _resetDetection: () => { detectedEndpoint = null }
}

export default suppliersApi
