import api, { clean, data } from './client'

export const customersApi = {
    // sort: newest | name | debt | last_activity | overdue_first; page bilan {data, meta}
    list: (params = {}) => data(api.get('/customers', { params: clean({ page: 1, per_page: 30, ...params }) })),
    get: (id) => data(api.get(`/customers/${id}`)),
    summary: (id) => data(api.get(`/customers/${id}/summary`)),
    timeline: (id, params = {}) => data(api.get(`/customers/${id}/timeline`, { params: clean(params) })),
    // 422 + existing_customer_id — takror raqam
    create: (payload) => data(api.post('/customers', payload)),
    update: (id, payload) => data(api.put(`/customers/${id}`, payload)),
    remove: (id) => data(api.delete(`/customers/${id}`)),
    paymentPreview: (id, payload) => data(api.post(`/customers/${id}/payments/preview`, payload)),
    pay: (id, payload) => data(api.post(`/customers/${id}/payments`, payload))
}
