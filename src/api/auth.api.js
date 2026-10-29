import api, { data } from './client'

export const authApi = {
    // otpRequest: kod Telegram (@daftaron_bot) yoki SMS orqali
    otpRequest: (phone, channel = 'auto') => data(api.post('/auth/otp/request', { phone, channel })),
    // otpVerify: 200 — mavjud, 201 — yangi akkaunt (onboarding.step = shop)
    otpVerify: (payload) => data(api.post('/auth/otp/verify', payload)),
    login: (phone, password, device_name) => data(api.post('/auth/login', { phone, password, device_name })),
    // Parol bilan kirishda SMS tasdig'i so'ralsa (requires_verification)
    verify: (phone, code, type) => data(api.post('/auth/verify', { phone, code, type })),
    // Telegram: imzolangan init_data yoki bot havolasi (phone + ts + sig)
    telegramLogin: (payload) => data(api.post('/auth/telegram-login', payload)),
    forgotPassword: (phone) => data(api.post('/auth/password/forgot', { phone })),
    verifyPasswordReset: (phone, code) => data(api.post('/auth/password/verify', { phone, code })),
    resetPassword: (reset_token, password, password_confirmation) =>
        data(api.post('/auth/password/reset', { reset_token, password, password_confirmation })),
    me: () => data(api.get('/auth/me')),
    logout: () => data(api.post('/auth/logout')),
    devices: () => data(api.get('/auth/devices')),
    revokeDevice: (id) => data(api.delete(`/auth/devices/${id}`)),
    logoutAll: () => data(api.post('/auth/logout-all', { include_current: false }))
}

export const onboardingApi = {
    state: () => data(api.get('/onboarding')),
    shop: (payload) => data(api.post('/onboarding/shop', payload)),
    complete: () => data(api.post('/onboarding/complete'))
}
