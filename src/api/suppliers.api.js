import api from './axios'
import { todayYmd, toYmd } from '../utils/date'

// Ta'minotchilar API (OpenAPI v1.3.0). Faqat hujjatlashtirilgan endpointlar:
//   /suppliers, /suppliers/{id}, /suppliers/{id}/transactions, /suppliers/{id}/debt,
//   /suppliers/{id}/payment, /supplier-transactions, /supplier-transactions/{id}/cancel

const unwrapList = (data) => (Array.isArray(data) ? data : (data?.data || []))
const unwrapSupplier = (data) => data?.supplier || data?.data || data

const cleanParams = (params = {}) => {
    const out = {}
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') out[k] = v
    })
    return out
}

export const suppliersApi = {
    getSuppliers: async (params = {}) => {
        const res = await api.get('/suppliers', { params: cleanParams(params) })
        const list = unwrapList(res.data)
        return { data: list, meta: res.data?.meta || null, total: res.data?.meta?.total ?? list.length }
    },

    getSupplier: async (id) => {
        const res = await api.get(`/suppliers/${id}`)
        return unwrapSupplier(res.data)
    },

    getStatistics: async () => {
        const res = await api.get('/suppliers/statistics')
        return res.data
    },

    createSupplier: async (data) => {
        const res = await api.post('/suppliers', {
            name: data.name,
            company_name: data.company_name || null,
            phone: data.phone || null,
            address: data.address || null,
            note: data.note || null,
            ...(data.status ? { status: data.status } : {})
        })
        return unwrapSupplier(res.data)
    },

    updateSupplier: async (id, data) => {
        const res = await api.put(`/suppliers/${id}`, {
            name: data.name,
            company_name: data.company_name || null,
            phone: data.phone || null,
            address: data.address || null,
            note: data.note || null,
            ...(data.status ? { status: data.status } : {})
        })
        return unwrapSupplier(res.data)
    },

    deleteSupplier: async (id) => {
        const res = await api.delete(`/suppliers/${id}`)
        return res.data
    },

    // type: 'debt' | 'payment'; from/to: 'YYYY-MM-DD'
    getTransactions: async (supplierId, { type, from, to } = {}) => {
        const res = await api.get(`/suppliers/${supplierId}/transactions`, { params: cleanParams({ type, from, to }) })
        return unwrapList(res.data)
    },

    // Barcha ta'minotchilar bo'yicha bitta so'rov (har yozuvda supplier: {id, name, company_name, phone})
    getAllTransactions: async ({ type, from, to, supplier_id } = {}) => {
        const res = await api.get('/supplier-transactions', { params: cleanParams({ type, from, to, supplier_id }) })
        return unwrapList(res.data)
    },

    // Qarzga xarid (kreditorlik oshadi)
    createDebt: async (supplierId, { amount, transaction_date, due_date, description }) => {
        const res = await api.post(`/suppliers/${supplierId}/debt`, cleanParams({
            amount,
            transaction_date,
            due_date,
            description: description || undefined
        }))
        return res.data
    },

    // To'lov: server FIFO taqsimlaydi, ortiqcha to'lov 422 qaytaradi
    createPayment: async (supplierId, { amount, transaction_date, description }) => {
        const res = await api.post(`/suppliers/${supplierId}/payment`, cleanParams({
            amount,
            transaction_date,
            description: description || undefined
        }))
        return res.data
    },

    cancelTransaction: async (transactionId) => {
        const res = await api.patch(`/supplier-transactions/${transactionId}/cancel`)
        return res.data
    }
}

/* =====================================================================
   Eski versiyadan qolgan, faqat telefonda saqlangan xarid/to'lovlarni
   bir marta serverga yuborish (supplier_{id}_purchases / _payments)
   ===================================================================== */

const LEGACY_KEY_RE = /^supplier_(\d+)_(purchases|payments)$/
const FAILED_KEY = 'supplier_unsynced_v1'
export const SUPPLIER_MIGRATION_EVENT = 'supplier-migration-done'
const LEGACY_CACHE_KEYS = ['suppliers_page_balances_cache_v1', 'suppliers_page_list_v1']

const readJson = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback } catch { return fallback }
}

const legacyDate = (row, kind) => {
    const raw = kind === 'purchases'
        ? (row.purchase_date || row.date || row.created_at)
        : (row.paid_at || row.date || row.created_at)
    const ymd = toYmd(raw)
    const today = todayYmd()
    return !ymd || ymd > today ? today : ymd
}

const legacyDescription = (row) => {
    const parts = []
    const ref = row.reference || row.invoice_number
    if (ref) parts.push(`INV ${ref}`)
    const desc = row.description || row.note
    if (desc) parts.push(desc)
    return parts.join(' · ').slice(0, 500) || null
}

export const getUnsyncedSupplierRecords = () => readJson(FAILED_KEY, [])

export const clearUnsyncedSupplierRecords = () => {
    try { localStorage.removeItem(FAILED_KEY) } catch { /* ignore */ }
}

// Qaytaradi: { synced, failed } — failed yozuvlar FAILED_KEY da foydalanuvchiga ko'rsatish uchun qoladi
export const migrateLegacySupplierRecords = async () => {
    let keys = []
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (k && LEGACY_KEY_RE.test(k)) keys.push(k)
        }
    } catch {
        return { synced: 0, failed: 0 }
    }
    LEGACY_CACHE_KEYS.forEach((k) => { try { localStorage.removeItem(k) } catch { /* ignore */ } })
    if (keys.length === 0) return { synced: 0, failed: 0 }

    // Faqat shu do'konning ta'minotchilari (boshqa akkaunt yozuvlariga tegmaymiz)
    let ownIds
    try {
        const { data } = await suppliersApi.getSuppliers()
        ownIds = new Map(data.map((s) => [String(s.id), s.name]))
    } catch {
        return { synced: 0, failed: 0 }
    }

    // Avval xaridlar (qarz), keyin to'lovlar: aks holda to'lov "ortiqcha" bo'lib qoladi
    keys = keys
        .filter((k) => ownIds.has(k.match(LEGACY_KEY_RE)[1]))
        .sort((a, b) => (a.endsWith('_purchases') === b.endsWith('_purchases') ? 0 : a.endsWith('_purchases') ? -1 : 1))

    const failed = getUnsyncedSupplierRecords()
    let synced = 0

    for (const key of keys) {
        const [, supplierId, kind] = key.match(LEGACY_KEY_RE)
        const rows = readJson(key, [])
        const ordered = [...(Array.isArray(rows) ? rows : [])]
            .sort((a, b) => legacyDate(a, kind).localeCompare(legacyDate(b, kind)))
        const remaining = [...ordered]

        for (const row of ordered) {
            const amount = Number(row.amount ?? row.total_amount) || 0
            const transaction_date = legacyDate(row, kind)
            const description = legacyDescription(row)
            try {
                if (amount > 0) {
                    if (kind === 'purchases') await suppliersApi.createDebt(supplierId, { amount, transaction_date, description })
                    else await suppliersApi.createPayment(supplierId, { amount, transaction_date, description })
                    synced++
                }
            } catch (err) {
                const status = err?.response?.status
                // Tarmoq xatosi: yozuv joyida qoladi, keyingi ochilishda qayta urinamiz
                if (!status) break
                failed.push({
                    supplier_id: Number(supplierId),
                    supplier_name: ownIds.get(supplierId) || null,
                    kind: kind === 'purchases' ? 'debt' : 'payment',
                    amount,
                    transaction_date,
                    description,
                    reason: err?.response?.data?.message || `Xato ${status}`
                })
            }
            // Har bir yozuv alohida o'chiriladi: yarim yo'lda uzilsa, takror yuborilmaydi
            remaining.shift()
            try {
                if (remaining.length) localStorage.setItem(key, JSON.stringify(remaining))
                else localStorage.removeItem(key)
            } catch { /* ignore */ }
        }
    }

    try {
        if (failed.length) localStorage.setItem(FAILED_KEY, JSON.stringify(failed))
    } catch { /* ignore */ }
    // Ochiq sahifalar (Ta'minotchilar) yangi qarzdorlik va yuborilmaganlar ro'yxatini qayta o'qisin
    if (synced || failed.length) window.dispatchEvent(new Event(SUPPLIER_MIGRATION_EVENT))
    return { synced, failed: failed.length }
}

export default suppliersApi
