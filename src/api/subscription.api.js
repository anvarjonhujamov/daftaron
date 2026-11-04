import api, { clean, data } from './client'

// Backend days_remaining'ni kasr son qilib yuboradi (9.507...) — butun kunga yaxlitlaymiz (qisman kun ham kun)
const roundDays = (res) => {
    const days = res?.trial_info?.days_remaining
    if (days === undefined || days === null || days === '' || !Number.isFinite(Number(days))) return res
    return { ...res, trial_info: { ...res.trial_info, days_remaining: Math.max(0, Math.ceil(Number(days))) } }
}

export const subscriptionApi = {
    // { balance, trial_info, usage, plans, extra_packages, ... }
    status: () => data(api.get('/subscription/status')).then(roundDays),
    // months: 12 — yillik (10 oy narxi)
    choose: (planId, { months, promo_code } = {}) =>
        data(api.post(`/subscription/choose/${planId}`, clean({ months, promo_code }))),
    buyExtra: (packageId) => data(api.post(`/subscription/buy-extra/${packageId}`)),
    checkPromo: (code) => data(api.post('/promo-codes/check', { code })),
    setAutoRenew: (enabled) => data(api.put('/subscription/auto-renew', { enabled })),
    transactions: (params = {}) =>
        data(api.get('/subscription/transactions', { params: clean({ page: 1, per_page: 20, ...params }) }))
}
