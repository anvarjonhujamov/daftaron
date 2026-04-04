import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { staffApi } from '../api/staff.api'
import { Users, UserPlus, ArrowLeft, MoreVertical, Search, Briefcase, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function StaffPage() {
    const navigate = useNavigate()
    const [staff, setStaff] = useState([])
    const [loading, setLoading] = useState(true)

    // Using dummy function placeholders since it's just frontend integration
    useEffect(() => {
        loadStaff()
    }, [])

    const loadStaff = async () => {
        setLoading(true)
        try {
            const data = await staffApi.getStaff()
            setStaff(data.data || data || [])
        } catch (err) {
            toast.error('Xodimlarni yuklashda xatolik yuz berdi')
            // Add some mock data if it fails (for visual testing)
            setStaff([
                { id: 1, name: 'Anvarjon H', phone: '+998901234567', status: 1, stats: { customers_served: 42, debts_created: 15, payments_received: 2000000 } },
                { id: 2, name: 'Sardor N', phone: '+998941234567', status: 1, stats: { customers_served: 12, debts_created: 5, payments_received: 500000 } }
            ])
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
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
                    <h1 className="flex-1 text-[17px] font-bold text-gray-900 dark:text-white truncate">
                        Xodimlar
                    </h1>
                    <button
                        onClick={() => toast.success("Tez kunda!")}
                        className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <UserPlus size={20} />
                    </button>
                </div>
            </div>

            <div className="p-4 flex-1">
                <div className="mb-6 bg-gradient-to-br from-indigo-500 to-blue-500 p-5 rounded-2xl text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-[18px] font-bold mb-1">Xodimlar ro'yxati</h2>
                        <p className="text-[13px] text-white/80 mb-4">
                            Biznesingizni boshqarishda yordam beruvchi xodimlar
                        </p>
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Users size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="text-[20px] font-bold leading-none">{staff.length}</p>
                                <p className="text-[11px] text-white/70">Jami xodimlar</p>
                            </div>
                        </div>
                    </div>
                </div>

                {staff.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-10 px-4 text-center">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <Briefcase size={28} className="text-gray-400" />
                        </div>
                        <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-1">
                            Xodimlar topilmadi
                        </h3>
                        <p className="text-[14px] text-gray-500 dark:text-gray-400 max-w-[250px] mb-6">
                            Siz hali xodim qo'shmagansiz. Yangi xodim qo'shib ishlaringizni yengillashtiring.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {staff.map(s => (
                            <div key={s.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-3">
                                <div className="flex items-center gap-3 justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-full flex items-center justify-center text-lg font-bold">
                                            {s.name?.charAt(0)?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-[15px] font-bold text-gray-900 dark:text-white">{s.name}</p>
                                            <p className="text-[13px] text-gray-500">{s.phone}</p>
                                        </div>
                                    </div>
                                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 text-[10px] uppercase font-bold rounded-md">
                                        Faol
                                    </span>
                                </div>
                                <div className="h-px w-full bg-gray-50 dark:bg-gray-700/50"></div>
                                <div className="flex justify-between items-center px-1">
                                    <div className="flex flex-col items-center">
                                        <span className="text-[11px] text-gray-400">Mijozlar</span>
                                        <span className="text-[14px] font-bold text-gray-800 dark:text-white">{s.stats?.customers_served || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[11px] text-gray-400">Nasiyalar</span>
                                        <span className="text-[14px] font-bold text-gray-800 dark:text-white">{s.stats?.debts_created || 0}</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[11px] text-gray-400">Tushumlar</span>
                                        <span className="text-[14px] font-bold text-blue-500 whitespace-nowrap">{Intl.NumberFormat('uz-UZ').format(s.stats?.payments_received || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
