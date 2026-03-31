import api from './client'

export const categoriesApi = {
  async getCategories() {
    try {
      const response = await api.get('/locations/categories')
      const data = response.data
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.data)) return data.data
      return []
    } catch {
      return []
    }
  }
}

export default categoriesApi
