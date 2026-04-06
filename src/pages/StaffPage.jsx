import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { staffApi } from '../api/staff.api'
import { 
    Users, UserPlus, ArrowLeft, MoreVertical, 
    Briefcase, Trash2, Edit2, AlertCircle, Loader2 
} from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import StaffModal from '../components/StaffModal'

export default function StaffPage() {
    const navigate = useNavigate()
    const [staff, setStaff] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingStaff, setEditingStaff] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    
    const getActiveTenantId = () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            return user?.tenant_id || null
        } catch {
            return null
        }
    }

    useEffect(() => {
        loadStaff()
    }, [])

    const loadStaff = async () => {
        setLoading(true)
        try {
            const response = await staffApi.getStaff()
            // Standardizing data access for both {data: []} and [] formats
            setStaff(response.data || response || [])
        } catch (err) {
            console.error('Failed to load staff:', err)
            const msg = err.response?.data?.message || 'Xodimlarni yuklashda xatolik yuz berdi'
            toast.error(msg)
            setStaff([]) // Clear list on error
        } finally {
            setLoading(false)
        }
    }

    const handleSaveStaff = async (formData) => {
        try {
            if (editingStaff) {
                await staffApi.updateStaff(editingStaff.id, formData)
                toast.success("Xodim muvaffaqiyatli tahrirlandi")
            } else {
                const tenantId = getActiveTenantId()
                await staffApi.createStaff({
                    ...formData,
                    ...(tenantId ? { tenant_id: tenantId } : {})
                })
                toast.success("Yangi xodim muvaffaqiyatli qo'shildi")
            }
            loadStaff()
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
                        onClick={() => navigate('/profile')}
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
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] text-gray-400 font-medium">{s.phone}</p>
                                                <div className="w-1 h-1 rounded-full bg-gray-300" />
                                                <span className="text-[11px] font-bold text-green-500 uppercase tracking-tight">Active</span>
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

                                <div className="grid grid-cols-3 gap-2 bg-gray-50/50 dark:bg-gray-700/30 p-3 rounded-2xl">
                                    <div className="text-center">
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Mijozlar</span>
                                        <span className="text-[15px] font-bold text-gray-800 dark:text-white">{s.stats?.customers_served || 0}</span>
                                    </div>
                                    <div className="text-center border-x border-gray-100 dark:border-gray-700/50">
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Nasiyalar</span>
                                        <span className="text-[15px] font-bold text-gray-800 dark:text-white">{s.stats?.debts_created || 0}</span>
                                    </div>
                                    <div className="text-center">
                                        <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Tushumlar</span>
                                        <span className="text-[15px] font-bold text-blue-500 truncate px-1">
                                            {Intl.NumberFormat('uz-UZ').format(s.stats?.payments_received || 0)}
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
