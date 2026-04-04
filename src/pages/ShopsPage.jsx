import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tenantsApi } from '../api/tenants.api'
import { Store, Plus, ArrowLeft, MapPin, Search, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ShopsPage() {
    const navigate = useNavigate()
    const [shops, setShops] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeId, setActiveId] = useState(null)

    useEffect(() => {
        loadShops()
    }, [])

    const loadShops = async () => {
        setLoading(true)
        try {
            const data = await tenantsApi.getTenants()
            if (data.tenants) {
                setShops(data.tenants)
                setActiveId(data.active_tenant_id)
            } else {
                setShops(data || [])
            }
        } catch (err) {
            toast.error("Do'konlarni yuklashda xatolik yuz berdi")
            // Dummy for view
            const dummy = [
                { id: 1, name: 'MTP Market', location: 'Toshkent sh, Yunusobod', is_active: true },
                { id: 2, name: 'Chilonzor Savdo', location: 'Toshkent sh, Chilonzor', is_active: false }
            ]
            setShops(dummy)
            setActiveId(1)
        } finally {
            setLoading(false)
        }
    }

    const setAsActive = async (id) => {
        const loadingToast = toast.loading("Faol do'kon o'zgartirilmoqda...")
        try {
            await tenantsApi.setActiveTenant(id)
            setActiveId(id)
            toast.success("Faol do'kon o'zgartirildi", { id: loadingToast })
            // Opt: reload page or reload context
            setTimeout(() => {
                navigate('/')
            }, 500)
        } catch (e) {
            toast.error("Xatolik yuz berdi", { id: loadingToast })
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
                        Mening do'konlarim
                    </h1>
                    <button
                        onClick={() => toast.success("Yangi biznes qo'shish! Tez kunda")}
                        className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
                    >
                        <Plus size={20} />
                    </button>
                </div>
            </div>

            <div className="p-4 flex-1">
                <div className="mb-6 bg-gradient-to-br from-purple-500 to-indigo-600 p-5 rounded-2xl text-white shadow-lg shadow-purple-500/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-[18px] font-bold mb-1">Biznes tarmoqlari</h2>
                            <p className="text-[13px] text-white/80 max-w-[200px]">
                                O'z do'konlaringizni bitta joydan osongina boshqaring.
                            </p>
                        </div>
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center rotate-12">
                            <Store size={32} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="grid gap-4">
                    {shops.map(shop => {
                        const isActive = shop.id === activeId || shop.is_active
                        return (
                        <div 
                            key={shop.id} 
                            onClick={() => !isActive && setAsActive(shop.id)}
                            className={`p-4 rounded-2xl transition-all duration-300 relative overflow-hidden ${
                                isActive 
                                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 dark:from-emerald-900/20 dark:to-teal-900/20 dark:border-emerald-600 shadow-md shadow-emerald-500/10' 
                                    : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm active:scale-[0.98]'
                            }`}
                        >
                            {isActive && (
                                <div className="absolute top-0 right-0 p-3">
                                    <CheckCircle2 size={24} className="text-emerald-500 drop-shadow-sm" />
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                    isActive ? 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-600 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                }`}>
                                    <Store size={22} />
                                </div>
                                <div className="flex-1 mt-1">
                                    <p className={`text-[17px] font-bold ${isActive ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-900 dark:text-white'}`}>
                                        {shop.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1.5 text-gray-500 dark:text-gray-400">
                                        <MapPin size={13} />
                                        <span className="text-[12px]">{shop.location || "Hudud belgilanmagan"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            </div>
        </div>
    )
}
