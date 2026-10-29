import api, { clean, data } from './client'

export const staffApi = {
    permissions: () => data(api.get('/staff/permissions')),
    list: (params = {}) => data(api.get('/staff', { params: clean(params) })),
    get: (id) => data(api.get(`/staff/${id}`)),
    // 402 plan_limit — ta'rifdagi xodimlar soni tugagan
    invite: (payload) => data(api.post('/staff', payload)),
    update: (id, payload) => data(api.put(`/staff/${id}`, payload)),
    suspend: (id) => data(api.post(`/staff/${id}/suspend`)),
    activate: (id) => data(api.post(`/staff/${id}/activate`)),
    remove: (id) => data(api.delete(`/staff/${id}`))
}
