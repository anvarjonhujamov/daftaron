import api, { data } from './client'

// Ochiq sozlamalar (oferta, maxfiylik, aloqa) — /api/public/settings, v1 prefiksisiz
const PUBLIC_BASE = api.defaults.baseURL.replace(/\/v1\/?$/, '')

export const settingsApi = {
    get: () => data(api.get('/settings')),
    updateShop: (payload) => data(api.put('/settings/shop', payload)),
    updateNotifications: (payload) => data(api.put('/settings/notifications', payload)),
    acceptLegal: (offer_version, privacy_version) => data(api.post('/legal/accept', { offer_version, privacy_version })),
    publicSettings: () => data(api.get('/public/settings', { baseURL: PUBLIC_BASE }))
}

export const profileApi = {
    // name, theme: light|dark, language: uz_latn|uz_cyrl|ru (telefon faqat kod bilan almashadi)
    update: (payload) => data(api.put('/profile', payload)),
    updatePassword: (payload) => data(api.put('/profile/password', payload)),
    setLoginMethod: (login_method) => data(api.put('/profile/login-method', { login_method })),
    phoneRequest: (phone) => data(api.post('/profile/phone/request', { phone })),
    phoneVerify: (phone, code) => data(api.post('/profile/phone/verify', { phone, code }))
}

export const telegramApi = {
    chats: () => data(api.get('/telegram/chats')),
    linkToken: () => data(api.post('/telegram/link-token')),
    linkSelf: () => data(api.post('/telegram/link-self')),
    removeChat: (id) => data(api.delete(`/telegram/chats/${id}`))
}

export const locationsApi = {
    regions: () => data(api.get('/locations/regions')),
    districts: (regionId) => data(api.get(`/locations/districts/${regionId}`)),
    streets: (districtId) => data(api.get(`/locations/streets/${districtId}`)),
    categories: () => data(api.get('/locations/categories'))
}

export const supportApi = {
    send: (message) => data(api.post('/support/chat', { message })),
    history: () => data(api.get('/support/history')),
    clear: () => data(api.delete('/support/history'))
}
