import api, { clean, data } from './client'

export const debtsApi = {
    list: (params = {}) => data(api.get('/debts', { params: clean({ page: 1, per_page: 50, ...params }) })),
    get: (id) => data(api.get(`/debts/${id}`)),
    // 422 limit_exceeded {can_force, exceeded_by...} — force: true bilan qayta yuboriladi
    create: (payload) => data(api.post('/debts', payload)),
    update: (id, payload) => data(api.put(`/debts/${id}`, payload)),
    extend: (id, due_date, reason) => data(api.post(`/debts/${id}/extend`, { due_date, reason })),
    writeOff: (id, reason) => data(api.post(`/debts/${id}/write-off`, { reason })),
    cancel: (id, reason) => data(api.post(`/debts/${id}/cancel`, { reason })),
    reminders: (id) => data(api.get(`/debts/${id}/reminders`))
}

export const paymentsApi = {
    // Butun kvitansiya bekor qilinadi, nasiyalar qayta ochiladi
    cancel: (id, reason) => data(api.post(`/payments/${id}/cancel`, { reason }))
}

export const overdueApi = {
    // days: 1-7 | 8-30 | 30+; sms_status: sent | not_sent | failed
    list: (params = {}) => data(api.get('/overdue', { params: clean(params) })),
    bulkSms: (customer_ids, dry_run) => data(api.post('/overdue/bulk-sms', { customer_ids, dry_run }))
}

export const smsApi = {
    list: (params = {}) => data(api.get('/sms', { params: clean({ page: 1, per_page: 30, ...params }) })),
    quota: () => data(api.get('/sms/quota')),
    retry: (id) => data(api.post(`/sms/${id}/retry`))
}
