import api from './axios'

// Categories API used only during registration to choose business category.
// Backend may or may not expose /categories; we handle both cases gracefully.

export const categoriesApi = {
  // Try to load categories from backend: GET /categories
  async getCategories() {
    try {
      const response = await api.get('/categories')
      const data = response.data
      if (Array.isArray(data)) {
        return data
      }
      if (data && Array.isArray(data.data)) {
        return data.data
      }
      return []
    } catch {
      // If endpoint does not exist or fails, just return empty and use fallback in UI
      return []
    }
  },

  // Fallback list when API is not available, so category_id can still be sent.
  getCategoriesFallback() {
    return [
      { id: 1, name: "Do'kon" },
      { id: 2, name: 'Chakana savdo' },
      { id: 3, name: 'Ulgurji savdo' },
      { id: 4, name: 'Boshqa' }
    ]
  }
}

export default categoriesApi

