// API xatosidan foydalanuvchiga ko'rsatiladigan o'zbekcha matn.
// 422: birinchi maydon xatosi; 402/403/409/429 — backend `message` yoki umumiy matn.
export const errorMessage = (err, fallback = "Xatolik yuz berdi. Qayta urinib ko'ring.") => {
    if (!err?.response) {
        return navigator.onLine === false
            ? "Internet yo'q. Ulanishni tekshiring."
            : "Serverga ulanib bo'lmadi. Qayta urinib ko'ring."
    }
    const { status, data } = err.response
    const first = data?.errors && Object.values(data.errors).flat()[0]
    if (first) return String(first)
    if (data?.message) return String(data.message)
    if (status === 403) return "Bu amal uchun huquqingiz yo'q."
    if (status === 402) return "Ta'rif limiti tugadi. Ta'rifni yangilang."
    if (status === 429) return "Juda ko'p urinish. Birozdan keyin qayta urining."
    if (status >= 500) return "Serverda xatolik. Birozdan keyin qayta urining."
    return fallback
}

// 422 maydon xatolari: { phone: 'Xato matni' }
export const fieldErrors = (err) => {
    const errors = err?.response?.data?.errors
    if (!errors) return {}
    return Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]))
}

export const errorReason = (err) => err?.response?.data?.reason || null
