import api from './axios'

const CANDIDATE_PATHS = [
    '/app/settings',
    '/public/info',
    '/public/settings',
    '/settings',
    '/app/info',
    '/app/public',
    '/site/info',
    '/app/meta',
    '/public/meta'
]

const tryGetFirst = async (paths) => {
    for (const p of paths) {
        try {
            const res = await api.get(p)
            if (res?.status === 200 && res.data) return res.data
        } catch (e) {
            // ignore and try next
        }
    }
    return null
}

const normalize = (data) => {
    if (!data) return {}

    const out = {}
    // Possible keys mapping
    out.privacy = data.privacy_html || data.privacy || data.privacy_text || data.privacy_html_text || data.privacyText || data.privacyHtml || null
    out.terms = data.terms_html || data.terms || data.terms_text || data.termsHtml || data.termsText || null
    out.telegram_support = data.telegram_support || data.telegram || data.telegram_support_url || data.telegram_support_url || data.telegramSupport || null
    out.telegram_discussion = data.telegram_discussion || data.telegram_discussion_url || data.telegram_discussionUrl || data.telegram_discussion || data.telegramDiscussion || null

    out.requisites = {
        company_name: data.company_name || data.company || data.requisites?.company_name || data.requisites?.company || null,
        inn: data.inn || data.INN || data.requisites?.inn || null,
        address: data.address || data.requisites?.address || null,
        phone: data.phone || data.phone_number || data.requisites?.phone || null,
        email: data.email || data.requisites?.email || null
    }

    return out
}

export const appApi = {
    getLegal: async () => {
        const data = await tryGetFirst(CANDIDATE_PATHS)
        return normalize(data)
    }
}

export default appApi
