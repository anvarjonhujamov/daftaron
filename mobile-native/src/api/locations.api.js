import api from './client'

export const locationsApi = {
  getRegions: async () => {
    const response = await api.get('/locations/regions')
    return response.data
  },

  getDistricts: async (regionId) => {
    const response = await api.get(`/locations/districts/${regionId}`)
    return response.data
  },

  getStreets: async (districtId) => {
    const response = await api.get(`/locations/streets/${districtId}`)
    return response.data
  }
}

export default locationsApi
