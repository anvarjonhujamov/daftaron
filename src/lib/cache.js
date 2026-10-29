import { getUser } from './session'

// Sahifa darhol chizilishi uchun oxirgi javob localStorage'da (avval keshdan, keyin fonda yangilash).
// Kalit foydalanuvchi va do'kon bilan bog'langan: boshqa do'kon ma'lumoti aralashmaydi.
const scope = () => {
    const user = getUser()
    return `c:${user?.id ?? 0}:${user?.tenant_id ?? 0}:`
}

export const readCache = (key) => {
    try {
        const raw = localStorage.getItem(scope() + key)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export const writeCache = (key, data) => {
    try {
        localStorage.setItem(scope() + key, JSON.stringify(data))
    } catch {
        // Joy tugasa eski keshlarni tozalaymiz
        try {
            Object.keys(localStorage).filter((k) => k.startsWith('c:')).forEach((k) => localStorage.removeItem(k))
        } catch { /* ignore */ }
    }
}
