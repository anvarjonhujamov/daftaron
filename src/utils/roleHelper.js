/**
 * Role Helper - Determine user role and permissions
 */

// /auth/me javobidagi roles: shop_owner | shop_worker. Roles hali yuklanmagan bo'lsa null.
export const isStaffFromUser = (user) => {
    if (!Array.isArray(user?.roles)) return null
    return user.roles.some((r) => (r?.name || r) === 'shop_worker')
}

export const isUserStaff = async (staffApi) => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        if (!user.id) return false
        const fromRoles = isStaffFromUser(user)
        if (fromRoles !== null) return fromRoles

        const staffList = await staffApi.getStaff()
        const staff = Array.isArray(staffList) ? staffList : (staffList.data || [])
        
        // Check if current user is in the staff list
        return staff.some(s => String(s.id) === String(user.id) || String(s.user_id) === String(user.id))
    } catch (err) {
        console.error('Failed to check staff status:', err)
        return false
    }
}

export const getUserRole = () => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        // Check explicit role field if it exists
        if (user.role) return user.role
        if (user.type) return user.type
        // Default to owner if not found (safest approach)
        return 'owner'
    } catch (err) {
        return 'owner'
    }
}

export default { isUserStaff, isStaffFromUser, getUserRole }
