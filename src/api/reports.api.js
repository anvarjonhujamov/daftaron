import api, { clean, data, downloadFile } from './client'

export const dashboardApi = {
    stats: () => data(api.get('/dashboard'))
}

export const historyApi = {
    // scope: customers | suppliers; type: all | payments | debts | sms; kursor bilan
    feed: (params = {}) => data(api.get('/history', { params: clean(params) })),
    exportXlsx: (params = {}) => downloadFile('/history/export.xlsx', params, 'tarix.xlsx')
}

export const reportsApi = {
    // period: day | week | month | year yoki from/to
    get: (params = {}) => data(api.get('/reports', { params: clean(params) })),
    exportXlsx: (params = {}) => downloadFile('/reports/export.xlsx', params, 'hisobot.xlsx')
}

export const notificationsApi = {
    list: (params = {}) => data(api.get('/notifications', { params: clean({ page: 1, per_page: 30, ...params }) })),
    unreadCount: () => data(api.get('/notifications/unread-count')),
    markRead: (ids) => data(api.post('/notifications/read', ids === 'all' ? { all: true } : { ids }))
}
