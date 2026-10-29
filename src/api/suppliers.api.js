import api, { clean, data, openFile } from './client'
import { todayYmd, toYmd } from '../utils/date'

const unwrapList = (res) => (Array.isArray(res) ? res : (res?.data || []))
const unwrapSupplier = (res) => res?.supplier || res?.data || res

// Xarid/to'lov: faktura rasmi bo'lsa multipart, aks holda JSON
const transactionBody = (payload) => {
    const files = payload.attachments || []
    const fields = clean({ ...payload, attachments: undefined })
    if (!files.length) return fields
    const form = new FormData()
    Object.entries(fields).forEach(([k, v]) => form.append(k, v))
    files.forEach((f) => form.append('attachments[]', f))
    return form
}

export const suppliersApi = {
    list: async (params = {}) => {
        const res = await data(api.get('/suppliers', { params: clean(params) }))
        return unwrapList(res)
    },
    get: async (id) => unwrapSupplier(await data(api.get(`/suppliers/${id}`))),
    statistics: () => data(api.get('/suppliers/statistics')),
    // name, phone, company_name, address, note, inn, product_type, opening_balance, opening_direction
    create: async (payload) => unwrapSupplier(await data(api.post('/suppliers', clean(payload)))),
    update: async (id, payload) => unwrapSupplier(await data(api.put(`/suppliers/${id}`, payload))),
    remove: (id) => data(api.delete(`/suppliers/${id}`)),
    transactions: async (id, params = {}) =>
        unwrapList(await data(api.get(`/suppliers/${id}/transactions`, { params: clean(params) }))),
    allTransactions: async (params = {}) =>
        unwrapList(await data(api.get('/supplier-transactions', { params: clean(params) }))),
    // Xarid (biz qarzdor bo'lamiz): amount, transaction_date, due_date, payment_method, doc_number, description, attachments
    addPurchase: (id, payload) => data(api.post(`/suppliers/${id}/debt`, transactionBody(payload))),
    // To'lov: server FIFO taqsimlaydi, qarzdan ortig'i 422
    addPayment: (id, payload) => data(api.post(`/suppliers/${id}/payment`, transactionBody(payload))),
    cancelTransaction: (id) => data(api.patch(`/supplier-transactions/${id}/cancel`)),
    openAttachment: (transactionId, index) => openFile(`/supplier-transactions/${transactionId}/attachments/${index}`)
}

/* Eski versiyada faqat telefonda saqlangan xarid/to'lovlarni (supplier_{id}_purchases / _payments)
   bir marta serverga yuborish. Yuborilmaganlari FAILED_KEY da foydalanuvchiga ko'rsatiladi. */

const LEGACY_KEY_RE = /^supplier_(\d+)_(purchases|payments)$/
const FAILED_KEY = 'supplier_unsynced_v1'
export const SUPPLIER_MIGRATION_EVENT = 'supplier-migration-done'

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
    if (keys.length === 0) return { synced: 0, failed: 0 }

    // Faqat shu do'konning ta'minotchilari (boshqa akkaunt yozuvlariga tegmaymiz)
    let ownIds
    try {
        const list = await suppliersApi.list()
        ownIds = new Map(list.map((s) => [String(s.id), s.name]))
    } catch {
        return { synced: 0, failed: 0 }
    }

    // Avval xaridlar, keyin to'lovlar: aks holda to'lov "ortiqcha" bo'lib qoladi
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
                    if (kind === 'purchases') await suppliersApi.addPurchase(supplierId, { amount, transaction_date, description })
                    else await suppliersApi.addPayment(supplierId, { amount, transaction_date, description })
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
    if (synced || failed.length) window.dispatchEvent(new Event(SUPPLIER_MIGRATION_EVENT))
    return { synced, failed: failed.length }
}
