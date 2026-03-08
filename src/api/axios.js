import axios from 'axios'

const api = axios.create({
    baseURL: 'https://daftaron.firstcoder.uz/api/v1',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
})

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor - handle 401 / 403
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        } else if (error.response?.status === 403) {
            // Trial tugagan yoki hisob faol emas — Sozlamalar sahifasiga yo'naltiramiz
            // Agar allaqachon ruxsat etilgan sahifada bo'lsa, redirect qilmaymiz
            const allowed = ['/profile', '/subscription']
            if (!allowed.includes(window.location.pathname)) {
                window.location.href = '/profile'
            }
        }
        return Promise.reject(error)
    }
)

export default api
