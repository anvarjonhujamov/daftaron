import api from './axios'

/**
 * Categories API — for registration (shop category).
 * Backend may expose GET /categories (public). If not, use getCategoriesFallback().
 */
export const categoriesApi = {
    /**
     * Fetch categories list (no auth required, for register form).
     * Returns [] if endpoint does not exist or fails.
     */
    getCategories: async () => {
        try {
            const response = await api.get('/categories')
            const data = response.data
            return Array.isArray(data) ? data : (data?.data ?? [])
        } catch (err) {
            return []
        }
    },

    /**
     * Fallback when backend has no /categories or returns error.
     * Use a default category so registration can succeed (backend often has id 1).
     */
    getCategoriesFallback: () => [
        { id: 1, name: "Do'kon" },
        { id: 2, name: "Chakana savdo" },
        { id: 3, name: "Ulgurji savdo" },
        { id: 4, name: "Boshqa" }
    ]
}

export default categoriesApi
