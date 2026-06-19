import api from './axios'

/**
 * Get legal document content (Privacy Policy or Public Offer)
 * @param {string} type - Document type: 'privacy_policy' or 'public_offer'
 * @returns {Promise<object>} Document content
 */
export const getLegalDocument = async (type) => {
    try {
        const response = await api.get(`/legal/${type}`)
        return response.data
    } catch (error) {
        console.error(`Error fetching ${type}:`, error)
        throw error
    }
}

/**
 * Update legal document content (Admin only)
 * @param {string} type - Document type: 'privacy_policy' or 'public_offer'
 * @param {string} content - HTML or plain text content
 * @returns {Promise<object>} Updated document
 */
export const updateLegalDocument = async (type, content) => {
    try {
        const response = await api.put(`/legal/${type}`, {
            content
        })
        return response.data
    } catch (error) {
        console.error(`Error updating ${type}:`, error)
        throw error
    }
}

/**
 * Get all legal documents
 * @returns {Promise<object>} All legal documents
 */
export const getAllLegalDocuments = async () => {
    try {
        const response = await api.get('/legal')
        return response.data
    } catch (error) {
        console.error('Error fetching legal documents:', error)
        throw error
    }
}
