import axios from 'axios'
import toast from 'react-hot-toast'

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

let subscriptionListener = null

export const setSubscriptionListener = (listener) => {
    subscriptionListener = listener
}

// Response interceptor - handle 401 / 403 / metadata
api.interceptors.response.use(
    (response) => {
        // Extract subscription/limit metadata if present
        if (response.data && response.data.subscription_status !== undefined) {
            if (subscriptionListener) {
                subscriptionListener(response.data)
            }
        }
        return response
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        
        // Check for limit/subscription errors in error response
        if (error.response?.data && error.response.data.subscription_status !== undefined) {
            const { subscription_status, remaining_limit } = error.response.data
            
            if (subscription_status === 'expired') {
                toast.error('Obunangiz tugagan')
            } else if (remaining_limit === 0) {
                toast.error('Limit tugadi')
            }

            if (subscriptionListener) {
                subscriptionListener(error.response.data)
            }
        }

        return Promise.reject(error)
    }
)

export default api
