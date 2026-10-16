import api from './axios'

// Ommaviy sozlamalar: GET /api/public/settings (v1 prefiksisiz, authsiz)
const PUBLIC_API_BASE = api.defaults.baseURL.replace(/\/v1\/?$/, '')

// "t.me/x", "@x" yoki to'liq URL -> https://... (aks holda window.open nisbiy yo'l deb ochadi)
const toTelegramUrl = (value) => {
    if (!value) return null
    const v = String(value).trim()
    if (/^https?:\/\//i.test(v)) return v
    if (v.startsWith('@')) return `https://t.me/${v.slice(1)}`
    return `https://${v.replace(/^\/+/, '')}`
}

export const appApi = {
    getLegal: async () => {
        const res = await api.get('/public/settings', { baseURL: PUBLIC_API_BASE })
        const data = res.data || {}
        return {
            privacy: data.privacy_policy || null,
            terms: data.public_offer || null,
            contact_phone: data.contact_phone || null,
            telegram_support: toTelegramUrl(data.contact_telegram),
            telegram_discussion: toTelegramUrl(data.contact_group)
        }
    }
}

export default appApi
