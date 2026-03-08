import api from './axios'

// Categories API used only during registration to choose business category.
// Backend may or may not expose /categories; we handle both cases gracefully.

export const categoriesApi = {
  // Try to load categories from backend: GET /locations/categories
  async getCategories() {
    try {
      const response = await api.get('/locations/categories')
      const data = response.data
      if (Array.isArray(data)) {
        return data
      }
      if (data && Array.isArray(data.data)) {
        return data.data
      }
      return []
    } catch {
      // If endpoint fails, return empty
      return []
    }
  }
}

export default categoriesApi

