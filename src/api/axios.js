import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
    baseURL: 'https://daftaron.firstcoder.uz/api/v1',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }
})

// Request interceptor - add auth token and tenant id
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token')
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        
        // Add active tenant id if available
        if (user?.tenant_id) {
            config.headers['X-Tenant-Id'] = user.tenant_id
        }
        
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor - handle 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export const setSubscriptionListener = () => {}

export default api
