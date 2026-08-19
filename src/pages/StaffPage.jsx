import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { staffApi } from '../api/staff.api'
import { debtsApi } from '../api/debts.api'
import { paymentsApi } from '../api/payments.api'
import { 
    Users, UserPlus, ArrowLeft, MoreVertical, 
    Briefcase, Trash2, Edit2, AlertCircle, Loader2,
    Eye, EyeOff, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import StaffModal from '../components/StaffModal'
import { isUserStaff } from '../utils/roleHelper'

export default function StaffPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [staff, setStaff] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingStaff, setEditingStaff] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [showPasswordIds, setShowPasswordIds] = useState(new Set())
    const [isStaffUser, setIsStaffUser] = useState(false)
    
    const getActiveTenantId = () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            return user?.tenant_id || null
        } catch {
            return null
        }
    }

    useEffect(() => {
        loadStaffData()
        const checkStaff = async () => { try { setIsStaffUser(await isUserStaff(staffApi)) } catch { setIsStaffUser(false) } }
        checkStaff()
    }, [])

    const getRelationIds = (item) => {
        const ids = [
            item.worker_id,
            item.staff_id,
            item.employee_id,
            item.user_id,
            item.created_by,
            item.created_by_id,
            item.owner_id,
            item.tenant_id,
            item.worker?.id,
            item.staff?.id,
            item.employee?.id,
            item.user?.id,
            item.created_by?.id,
            item.owner?.id,
            item.tenant?.id
        ]

        if (item.debt) {
            ids.push(
                item.debt.worker_id,
                item.debt.staff_id,
                item.debt.employee_id,
                item.debt.user_id,
                item.debt.created_by,
                item.debt.created_by_id,
                item.debt.owner_id,
                item.debt.tenant_id,
                item.debt.worker?.id,
                item.debt.staff?.id,
                item.debt.employee?.id,
                item.debt.user?.id,
                item.debt.created_by?.id,
                item.debt.owner?.id,
                item.debt.tenant?.id
            )
        }

        return ids
    }

    const isStaffRelated = (item, staffId) => {
        const id = Number(staffId)
        return getRelationIds(item).some((value) => Number(value) === id)
    }

    const getCustomerId = (item) => {
        return item.customer_id || item.customer?.id || item.debt?.customer_id || item.debt?.customer?.id || item.user_id || item.user?.id || null
    }

    const buildStaffStats = (workers, debts, payments) => {
        const statsMap = {}

        workers.forEach((worker) => {
            statsMap[worker.id] = {
                debt_count: 0,
                total_given: 0,
                total_paid: 0,
                remaining_amount: 0
            }
        })

        debts.forEach((debt) => {
            const related = workers.filter((worker) => isStaffRelated(debt, worker.id))
            related.forEach((worker) => {
                const totalAmount = Number(debt.total_amount || debt.amount || 0)
                const remainingAmount = Number(debt.remaining_amount || 0)

                statsMap[worker.id].debt_count += 1
                statsMap[worker.id].total_given += totalAmount
                statsMap[worker.id].remaining_amount += remainingAmount
            })
        })

        payments.forEach((payment) => {
            const related = workers.filter((worker) => isStaffRelated(payment, worker.id))
            related.forEach((worker) => {
                statsMap[worker.id].total_paid += Number(payment.amount || 0)
            })
        })

        return workers.map((worker) => ({
            ...worker,
            stats: {
                ...statsMap[worker.id]
            }
        }))
    }

    const loadStaffData = async () => {
        setLoading(true)
        try {
            const [staffResponse, debtsResponse, paymentsResponse] = await Promise.all([
                staffApi.getStaff(),
                debtsApi.getDebts({ per_page: 500 }),
                paymentsApi.getPayments({ per_page: 500 })
            ])

            const staffData = Array.isArray(staffResponse) ? staffResponse : (staffResponse.data || [])
            const debtsData = Array.isArray(debtsResponse) ? debtsResponse : (debtsResponse.data || [])
            const paymentsData = Array.isArray(paymentsResponse) ? paymentsResponse : (paymentsResponse.data || [])

            setStaff(buildStaffStats(staffData, debtsData, paymentsData))
        } catch (err) {
            console.error('Failed to load staff data:', err)
            const msg = err.response?.data?.message || 'Xodimlar statistikasi yuklanmadi'
            toast.error(msg)
            setStaff([])
        } finally {
            setLoading(false)
        }
    }

    const handleSaveStaff = async (formData) => {
        try {
            if (editingStaff) {
                const payload = { name: formData.name, phone: formData.phone }
                if (formData.password && typeof formData.password === 'string' && formData.password.length >= 6) {
                    payload.password = formData.password
                }
                await staffApi.updateStaff(editingStaff.id, payload)
                if (payload.password && formData.phone) {
                    try {
                        const saved = JSON.parse(localStorage.getItem('staff_passwords') || '{}')
                        saved[formData.phone] = payload.password
                        localStorage.setItem('staff_passwords', JSON.stringify(saved))
                    } catch { /* ignore */ }
                }
                toast.success("Xodim muvaffaqiyatli tahrirlandi")
            } else {
                const tenantId = getActiveTenantId()
                const newStaffPayload = {
                    ...formData,
                    ...(tenantId ? { tenant_id: tenantId } : {})
                }
                if (newStaffPayload.password && newStaffPayload.phone) {
                    try {
                        const saved = JSON.parse(localStorage.getItem('staff_passwords') || '{}')
                        saved[newStaffPayload.phone] = newStaffPayload.password
                        localStorage.setItem('staff_passwords', JSON.stringify(saved))
                    } catch { /* ignore */ }
                }
                await staffApi.createStaff(newStaffPayload)
                toast.success("Yangi xodim muvaffaqiyatli qo'shildi")
            }
            loadStaffData()
        } catch (err) {
            const resp = err.response?.data
            if (err.response?.status === 403) {
                toast.error("Sizning tarifingizda xodim qo'shish imkoniyati yo'q. Iltimos, tarifni yangilang.")
            } else if (err.response?.status === 422 && resp?.errors) {
                const firstFieldError = Object.values(resp.errors)?.[0]?.[0]
                toast.error(firstFieldError || "Kiritilgan ma'lumotlar noto'g'ri")
            } else if (resp?.message) {
                toast.error(resp.message)
            } else {
                toast.error("Xodimni saqlashda xatolik yuz berdi")
            }
            throw err // Let the modal know it failed
        }
    }

    const handleBack = () => {
        const from = location.state?.from
        if (from) {
            navigate(from)
            return
        }

        if (window.history.length > 1) {
            navigate(-1)
            return
        }

        navigate('/')
    }

    const handleDeleteStaff = async (id) => {
        if (!window.confirm("Haqiqatan ham ushbu xodimni o'chirib tashlamoqchimisiz?")) return

        setDeletingId(id)
        try {
            await staffApi.deleteStaff(id)
            toast.success("Xodim o'chirildi")
            setStaff(prev => prev.filter(s => s.id !== id))
        } catch (err) {
            toast.error(err.response?.data?.message || "Xodimni o'chirishda xatolik")
        } finally {
            setDeletingId(null)
        }
    }

    const pickStaffPassword = (s) => {
        if (!s) return null
        const keys = [
            'password', 'raw_password', 'plain_password', 'password_text',
            'pwd', 'passw', 'pass', 'login_password', 'staff_password',
            'user_password', 'password_plain', 'visible_password',
            'parol', 'parol_text'
        ]
        for (const k of keys) {
            const v = s[k]
            if (typeof v === 'string' && v.length > 0) return v
        }
        if (typeof s.user === 'object' && s.user) {
            for (const k of keys) {
                const v = s.user[k]
                if (typeof v === 'string' && v.length > 0) return v
            }
        }
        try {
            const saved = JSON.parse(localStorage.getItem('staff_passwords') || '{}')
            const phoneKeys = [s.phone, s.user?.phone, s.worker?.phone, s.login, s.username].filter(Boolean)
            for (const pk of phoneKeys) {
                if (saved[pk] && typeof saved[pk] === 'string' && saved[pk].length > 0) return saved[pk]
            }
        } catch { /* ignore */ }
        return null
    }

    const toggleShowPassword = (id) => {
        setShowPasswordIds(prev => {
            const n = new Set(prev)
            if (n.has(id)) n.delete(id); else n.add(id)
            return n
        })
    }

    if (loading && staff.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-700">
                <div className="px-4 h-[60px] flex items-center justify-between gap-3">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft size={22} className="text-gray-700 dark:text-gray-300" />
                    </button>
                    <h1 className="flex-1 text-[18px] font-extrabold text-gray-900 dark:text-white truncate">
                        Xodimlar
                    </h1>
                    <button
                        onClick={() => {
                            setEditingStaff(null)
                            setIsModalOpen(true)
                        }}
                        className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-blue-500/20"
                    >
                        <UserPlus size={20} />
                    </button>
                </div>
            </div>

            <div className="p-4 flex-1">
                {/* Stats Card */}
                <div className="mb-6 bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500 p-6 rounded-[24px] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-400/20 rounded-full -ml-12 -mb-12 blur-2xl" />
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-[20px] font-bold mb-1">Xodimlar boshqaruvi</h2>
                                <p className="text-[13px] text-white/80">
                                    Jamoangiz samaradorligini kuzatib boring
                                </p>
                            </div>
                            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
                                <Users size={24} className="text-white" />
                            </div>
                        </div>
                        
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-[32px] font-black leading-none mb-1">{staff.length}</p>
                                <p className="text-[11px] text-white/70 uppercase tracking-wider font-bold">Jami aktiv xodimlar</p>
                            </div>
                            {loading && <Loader2 size={20} className="animate-spin text-white/50 mb-1" />}
                        </div>
                    </div>
                </div>

                {staff.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center pt-16 px-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-[32px] flex items-center justify-center mb-6 border-4 border-white dark:border-gray-700 shadow-sm">
                            <Briefcase size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-2">
                            Hozircha xodimlar yo'q
                        </h3>
                        <p className="text-[14px] text-gray-500 dark:text-gray-400 max-w-[280px] mb-8 leading-relaxed">
                            Siz hali xodim qo'shmagansiz. Yangi xodim qo'shib biznesingizni kengaytiring.
                        </p>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="px-8 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-[15px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            Birinchi xodimni qo'shish
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {staff.map((s, index) => (
                            <div 
                                key={s.id} 
                                className="bg-white dark:bg-gray-800 p-5 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-center gap-4 justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-tr from-indigo-100 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner">
                                            {s.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight mb-1">{s.name}</p>
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[13px] text-gray-400 font-medium">{s.phone}</p>
                                                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                                                    <span className="text-[11px] font-bold text-green-500 uppercase tracking-tight">Active</span>
                                                </div>
                                                {!isStaffUser && (() => {
                                                    const rawPwd = pickStaffPassword(s)
                                                    const show = showPasswordIds.has(s.id)
                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            <Lock size={12} className={`${rawPwd ? 'text-gray-400' : 'text-gray-300 dark:text-gray-600'}`} />
                                                            <p className={`text-[12px] font-semibold font-mono tracking-wide select-all ${
                                                                rawPwd
                                                                    ? (show ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400')
                                                                    : 'text-gray-400/80 dark:text-gray-600 italic'
                                                            }`}>
                                                                {rawPwd
                                                                    ? (show ? rawPwd : '•'.repeat(Math.max(6, rawPwd.length)))
                                                                    : 'Parol saqlanmagan'
                                                                }
                                                            </p>
                                                            {rawPwd && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleShowPassword(s.id)}
                                                                    className="ml-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                                                    title={show ? 'Yashirish' : 'Ko\'rsatish'}
                                                                >
                                                                    {show ? <EyeOff size={14} /> : <Eye size={14} />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => {
                                                setEditingStaff(s)
                                                setIsModalOpen(true)
                                            }}
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteStaff(s.id)}
                                            disabled={deletingId === s.id}
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            {deletingId === s.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 bg-gray-50/50 dark:bg-gray-700/30 p-3 rounded-2xl">
                                    <div className="text-center p-1.5 rounded-xl">
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Nasiyalar</span>
                                        <span className="text-[15px] font-bold text-gray-800 dark:text-white">{s.stats?.debt_count || 0}</span>
                                    </div>
                                    <div className="text-center p-1.5 rounded-xl">
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Berilgan</span>
                                        <span className="text-[14px] font-bold text-gray-800 dark:text-white truncate block">
                                            {Intl.NumberFormat('uz-UZ').format(s.stats?.total_given || 0)}
                                        </span>
                                    </div>
                                    <div className="text-center p-1.5 rounded-xl">
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Tushum</span>
                                        <span className="text-[14px] font-bold text-blue-500 truncate block">
                                            {Intl.NumberFormat('uz-UZ').format(s.stats?.total_paid || 0)}
                                        </span>
                                    </div>
                                    <div className="text-center p-1.5 rounded-xl">
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Qolgan</span>
                                        <span className="text-[14px] font-bold text-red-500 truncate block">
                                            {Intl.NumberFormat('uz-UZ').format(s.stats?.remaining_amount || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <StaffModal 
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingStaff(null)
                }}
                onSave={handleSaveStaff}
                staff={editingStaff}
            />
        </div>
    )
}
