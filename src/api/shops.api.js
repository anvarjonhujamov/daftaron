import api, { data } from './client'

export const shopsApi = {
    overview: () => data(api.get('/shops')),
    setActive: (tenant_id) => data(api.put('/tenants/active', { tenant_id })),
    // 422 reason: plan_limit — ta'rifdagi do'konlar soni tugagan
    create: (payload) => data(api.post('/tenants', payload)),
    update: (id, payload) => data(api.put(`/tenants/${id}`, payload)),
    remove: (id) => data(api.delete(`/tenants/${id}`)),
    purgeRequest: (id) => data(api.post(`/tenants/${id}/purge-request`)),
    purgeConfirm: (id, code) => data(api.post(`/tenants/${id}/purge-confirm`, { code: String(code) })),
    transferCustomers: (id, to_tenant_id, customer_ids) =>
        data(api.post(`/tenants/${id}/customers/transfer`, { to_tenant_id, customer_ids }))
}
