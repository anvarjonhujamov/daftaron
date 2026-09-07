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

    getSupplierPurchases: async (id, params = {}) => {
        const subEndpoints = [
            `/${id}/purchases`, `/${id}/invoices`, `/${id}/orders`,
            `/${id}/bought`, `/${id}/buyings`, `/${id}/purchase-history`,
            `/${id}/products`, `/purchases`, `/invoices`
        ]
        for (const sub of subEndpoints) {
            try {
                const url = `${detectedEndpoint || ENDPOINT_CANDIDATES[0]}${sub}`
                const res = await api.get(url, { params })
                const d = res?.data
                const arr = Array.isArray(d) ? d
                    : d?.purchases || d?.invoices || d?.orders || d?.data || d?.items || []
                if (Array.isArray(arr)) return { data: arr, raw: d }
            } catch (err) {
                const status = err?.response?.status
                if (status === 401 || status === 403 || status === 422) break
            }
        }
        return { data: [], raw: null }
    },

    getSupplierPayments: async (id, params = {}) => {
        const subEndpoints = [
            `/${id}/payments`, `/${id}/transactions`, `/${id}/history`,
            `/${id}/paid`, `/${id}/payment-history`, `/${id}/movements`,
            `/${id}/ledger`, `/payments`
        ]
        for (const sub of subEndpoints) {
            try {
                const url = `${detectedEndpoint || ENDPOINT_CANDIDATES[0]}${sub}`
                const res = await api.get(url, { params })
                const d = res?.data
                const arr = Array.isArray(d) ? d
                    : d?.payments || d?.transactions || d?.movements || d?.history || d?.data || d?.items || []
                if (Array.isArray(arr)) return { data: arr, raw: d }
            } catch (err) {
                const status = err?.response?.status
                if (status === 401 || status === 403 || status === 422) break
            }
        }
        return { data: [], raw: null }
    },

    getSupplierLedger: async (id, params = {}) => {
        const subEndpoints = [
            `/${id}/ledger`, `/${id}/movements`, `/${id}/operations`,
            `/${id}/history`, `/${id}/transactions`, `/${id}/journal`
        ]
        for (const sub of subEndpoints) {
            try {
                const url = `${detectedEndpoint || ENDPOINT_CANDIDATES[0]}${sub}`
                const res = await api.get(url, { params })
                const d = res?.data
                const arr = Array.isArray(d) ? d
                    : d?.ledger || d?.movements || d?.operations || d?.history || d?.transactions || d?.data || d?.items || []
                if (Array.isArray(arr)) return { data: arr, raw: d }
            } catch (err) {
                const status = err?.response?.status
                if (status === 401 || status === 403 || status === 422) break
            }
        }
        return { data: [], raw: null }
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

/* =====================================================================
   PURCHASE + PAYMENT CRUD (localStorage fallback agar backend 404/405)
   ===================================================================== */

const LS = {
    p: (sid) => `supplier_${sid}_purchases`,
    y: (sid) => `supplier_${sid}_payments`,
    read: (k) => {
        try { return JSON.parse(localStorage.getItem(k) || '[]') } catch { return [] }
    },
    write: (k, arr) => {
        try { localStorage.setItem(k, JSON.stringify(arr)) } catch {}
    }
}

const tryWriteEndpoints = async (method, suffixArr, payload, idForLsRead, lsKeyReadFn) => {
    // 1) Try remote endpoints one by one; stop on 401/403/422; continue on 404/405
    const base = detectedEndpoint || ENDPOINT_CANDIDATES[0]
    for (const suffix of suffixArr) {
        try {
            const url = `${base}${suffix}`
            let res
            if (method === 'post') res = await api.post(url, payload)
            else if (method === 'put') res = await api.put(url, payload)
            else if (method === 'patch') res = await api.patch(url, payload)
            else if (method === 'delete') res = await api.delete(url)
            const d = res?.data
            return d?.purchase || d?.payment || d?.invoice || d?.transaction || d?.data || d || payload
        } catch (err) {
            const st = err?.response?.status
            if (st === 401 || st === 403 || st === 422) throw err
            // else try next
        }
    }
    // 2) All endpoints failed — localStorage fallback
    const lsKey = lsKeyReadFn(idForLsRead)
    const arr = LS.read(lsKey)
    if (method === 'post') {
        const row = { id: payload.id || `ls_${Date.now()}_${Math.floor(Math.random() * 10000)}`, ...payload, _local: true }
        arr.unshift(row)
        LS.write(lsKey, arr)
        return row
    }
    if (method === 'put' || method === 'patch') {
        const idx = arr.findIndex(r => String(r.id) === String(payload.id))
        if (idx >= 0) { arr[idx] = { ...arr[idx], ...payload, _local: true }; LS.write(lsKey, arr); return arr[idx] }
        return payload
    }
    if (method === 'delete') {
        const idx = arr.findIndex(r => String(r.id) === String(idForLsRead))
        if (idx >= 0) { const removed = arr.splice(idx, 1)[0]; LS.write(lsKey, arr); return removed }
        return { id: idForLsRead }
    }
    return payload
}

/* ---------- PURCHASE write helpers ---------- */

suppliersApi.createSupplierPurchase = async (supplierId, data) => {
    const payload = {
        supplier_id: supplierId,
        tenant_id: data.tenant_id ?? undefined,
        amount: Number(data.amount) || 0,
        total_amount: Number(data.total_amount ?? data.amount) || 0,
        description: data.description || data.note || null,
        note: data.note || data.description || null,
        reference: data.reference || data.invoice_number || data.order_number || null,
        invoice_number: data.invoice_number || data.reference || null,
        order_number: data.order_number || data.reference || null,
        purchase_date: data.purchase_date || data.date || new Date().toISOString().slice(0,10),
        date: data.date || data.purchase_date || new Date().toISOString().slice(0,10),
        status: data.status || 'unpaid',
        debt_type: 'supplier',
        type: 'supplier_purchase'
    }
    const suffixes = [
        `/${supplierId}/purchases`, `/${supplierId}/invoices`, `/${supplierId}/orders`,
        `/purchases`, `/invoices`, `/supplier_invoices`, `/debts`, `/${supplierId}/debts`
    ]
    return tryWriteEndpoints('post', suffixes, payload, supplierId, LS.p)
}

suppliersApi.updateSupplierPurchase = async (purchaseId, data) => {
    const payload = { id: purchaseId, ...data }
    const suffixes = [
        `/purchases/${purchaseId}`, `/invoices/${purchaseId}`, `/orders/${purchaseId}`,
        `/supplier_invoices/${purchaseId}`, `/debts/${purchaseId}`
    ]
    // For LS: find which supplier owns this purchase by checking all LS buckets
    const findSid = () => {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (k && k.startsWith('supplier_') && k.endsWith('_purchases')) {
                const arr = LS.read(k)
                if (arr.some(r => String(r.id) === String(purchaseId))) {
                    return k.replace('supplier_','').replace('_purchases','')
                }
            }
        }
        return purchaseId
    }
    return tryWriteEndpoints('put', suffixes, payload, findSid(), LS.p)
}

suppliersApi.deleteSupplierPurchase = async (purchaseId) => {
    const suffixes = [
        `/purchases/${purchaseId}`, `/invoices/${purchaseId}`, `/orders/${purchaseId}`,
        `/supplier_invoices/${purchaseId}`, `/debts/${purchaseId}`
    ]
    // find LS supplier owner
    let sid = purchaseId
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('supplier_') && k.endsWith('_purchases')) {
            const arr = LS.read(k)
            if (arr.some(r => String(r.id) === String(purchaseId))) {
                sid = k.replace('supplier_','').replace('_purchases','')
                break
            }
        }
    }
    return tryWriteEndpoints('delete', suffixes, { id: purchaseId }, sid, LS.p)
}

/* ---------- PAYMENT write helpers ---------- */

suppliersApi.createSupplierPayment = async (supplierId, data) => {
    const payload = {
        supplier_id: supplierId,
        tenant_id: data.tenant_id ?? undefined,
        purchase_id: data.purchase_id || data.invoice_id || data.debt_id || null,
        invoice_id: data.invoice_id || data.purchase_id || null,
        debt_id: data.debt_id || data.purchase_id || null,
        amount: Number(data.amount) || 0,
        total_amount: Number(data.total_amount ?? data.amount) || 0,
        description: data.description || data.note || null,
        note: data.note || data.description || null,
        paid_at: data.paid_at || data.date || new Date().toISOString().slice(0,10),
        date: data.date || data.paid_at || new Date().toISOString().slice(0,10),
        payment_method: data.payment_method || data.method || 'cash',
        method: data.method || data.payment_method || 'cash',
        payment_type: data.payment_type || (data.purchase_id ? 'purchase_payment' : 'supplier_balance'),
        type: 'supplier_payment'
    }
    const suffixes = [
        `/${supplierId}/payments`, `/${supplierId}/supplier_payments`,
        `/supplier_payments`, `/payments`, `/transactions`, `/${supplierId}/movements`,
        `/${supplierId}/ledger`
    ]
    return tryWriteEndpoints('post', suffixes, payload, supplierId, LS.y)
}

suppliersApi.updateSupplierPayment = async (paymentId, data) => {
    const payload = { id: paymentId, ...data }
    const suffixes = [
        `/payments/${paymentId}`, `/supplier_payments/${paymentId}`,
        `/transactions/${paymentId}`, `/movements/${paymentId}`
    ]
    let sid = paymentId
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('supplier_') && k.endsWith('_payments')) {
            const arr = LS.read(k)
            if (arr.some(r => String(r.id) === String(paymentId))) {
                sid = k.replace('supplier_','').replace('_payments','')
                break
            }
        }
    }
    return tryWriteEndpoints('put', suffixes, payload, sid, LS.y)
}

suppliersApi.deleteSupplierPayment = async (paymentId) => {
    const suffixes = [
        `/payments/${paymentId}`, `/supplier_payments/${paymentId}`,
        `/transactions/${paymentId}`, `/movements/${paymentId}`
    ]
    let sid = paymentId
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith('supplier_') && k.endsWith('_payments')) {
            const arr = LS.read(k)
            if (arr.some(r => String(r.id) === String(paymentId))) {
                sid = k.replace('supplier_','').replace('_payments','')
                break
            }
        }
    }
    return tryWriteEndpoints('delete', suffixes, { id: paymentId }, sid, LS.y)
}

/* ---------- Merge API data with LS fallback (so UI shows both) ---------- */
suppliersApi.getSupplierPurchasesMerged = async (supplierId, params = {}) => {
    const remote = await suppliersApi.getSupplierPurchases(supplierId, params)
    const ls = LS.read(LS.p(supplierId))
    // Dedup by id, prefer remote (if remote has id matching LS id, remote wins)
    const remoteIds = new Set((remote?.data || []).map(r => String(r.id)))
    const combined = [...(remote?.data || [])]
    for (const row of ls) if (!remoteIds.has(String(row.id))) combined.push(row)
    combined.sort((a,b) => {
        const da = new Date(a.purchase_date || a.date || a.created_at || 0)
        const db = new Date(b.purchase_date || b.date || b.created_at || 0)
        return db - da
    })
    return { data: combined, raw: remote?.raw || null }
}
suppliersApi.getSupplierPaymentsMerged = async (supplierId, params = {}) => {
    const remote = await suppliersApi.getSupplierPayments(supplierId, params)
    const ls = LS.read(LS.y(supplierId))
    const remoteIds = new Set((remote?.data || []).map(r => String(r.id)))
    const combined = [...(remote?.data || [])]
    for (const row of ls) if (!remoteIds.has(String(row.id))) combined.push(row)
    combined.sort((a,b) => {
        const da = new Date(a.paid_at || a.date || a.created_at || 0)
        const db = new Date(b.paid_at || b.date || b.created_at || 0)
        return db - da
    })
    return { data: combined, raw: remote?.raw || null }
}

export default suppliersApi
