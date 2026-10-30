import axios from 'axios'
import { clearLocalData, getToken, getUser } from '../lib/session'

// API manzili .env dan (VITE_API_URL). Dev'da mahalliy backend'ni ko'rsating,
// aks holda dev server ham prod bazaga yozadi va haqiqiy SMS yuboradi.
export const API_URL = import.meta.env.VITE_API_URL || 'https://daftaron.firstcoder.uz/api/v1'

const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: { Accept: 'application/json' }
})

// Token va faol do'kon (backend TZ 4.3: X-Tenant-Id)
api.interceptors.request.use((config) => {
    const token = getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    const tenantId = getUser()?.tenant_id
    if (tenantId && !config.headers['X-Tenant-Id']) config.headers['X-Tenant-Id'] = tenantId
    return config
})

// 401 — token eskirgan yoki boshqa qurilmadan chiqarilgan: hamma narsani tozalab kirishga
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && getToken()) {
            clearLocalData()
            if (!window.location.pathname.startsWith('/login')) window.location.replace('/login')
        }
        return Promise.reject(error)
    }
)

// Bo'sh qiymatlarsiz query (backend `per_page`ni `page`siz qabul qilmaydi — chaqiruvchi beradi)
export const clean = (params = {}) =>
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))

export const data = (promise) => promise.then((res) => res.data)

// Fayl yuklab olish (Excel, faktura): token sarlavhada, URL'da emas
export const downloadFile = async (url, params, fallbackName) => {
    let res
    try {
        res = await api.get(url, { params: clean(params), responseType: 'blob' })
    } catch (err) {
        // Xato javobi ham blob bo'lib keladi: message/reason o'qilishi uchun JSON'ga aylantiramiz
        const body = err?.response?.data
        if (body instanceof Blob && body.type.includes('json')) {
            try { err.response.data = JSON.parse(await body.text()) } catch { /* ignore */ }
        }
        throw err
    }
    const disposition = res.headers['content-disposition'] || ''
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
    const name = match ? decodeURIComponent(match[1]) : fallbackName
    const href = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = href
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 30000)
}

// Faylni yangi oynada ochish (rasm/PDF): blob URL — token tashqariga chiqmaydi
export const openFile = async (url) => {
    const win = window.open('', '_blank')
    try {
        const res = await api.get(url, { responseType: 'blob' })
        const href = URL.createObjectURL(res.data)
        if (win) win.location.href = href
        else window.location.href = href
        setTimeout(() => URL.revokeObjectURL(href), 60000)
    } catch (err) {
        win?.close()
        throw err
    }
}

export default api
