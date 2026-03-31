import axios from 'axios'

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'https://daftaron.firstcoder.uz/api/v1'

let authToken = null
let unauthorizedHandler = null

export function setAuthToken(token) {
  authToken = token || null
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && unauthorizedHandler) {
      unauthorizedHandler(error)
    }
    return Promise.reject(error)
  }
)

export default api
