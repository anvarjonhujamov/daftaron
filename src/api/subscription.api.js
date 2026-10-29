import api, { clean, data } from './client'

export const subscriptionApi = {
    // { balance, trial_info, usage, plans, extra_packages, ... }
    status: () => data(api.get('/subscription/status')),
    // months: 12 — yillik (10 oy narxi)
    choose: (planId, { months, promo_code } = {}) =>
        data(api.post(`/subscription/choose/${planId}`, clean({ months, promo_code }))),
    buyExtra: (packageId) => data(api.post(`/subscription/buy-extra/${packageId}`)),
    checkPromo: (code) => data(api.post('/promo-codes/check', { code })),
    setAutoRenew: (enabled) => data(api.put('/subscription/auto-renew', { enabled })),
    transactions: (params = {}) =>
        data(api.get('/subscription/transactions', { params: clean({ page: 1, per_page: 20, ...params }) }))
}
