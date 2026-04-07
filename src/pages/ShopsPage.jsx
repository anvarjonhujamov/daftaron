import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Drawer } from 'vaul'
import { tenantsApi } from '../api/tenants.api'
import { categoriesApi } from '../api/categories.api'
import { Store, Plus, ArrowLeft, MapPin, CheckCircle2, X, Loader2, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import LocationSelector from '../components/LocationSelector'

export default function ShopsPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [shops, setShops] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeId, setActiveId] = useState(null)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [categories, setCategories] = useState([])
    const [savingShop, setSavingShop] = useState(false)
    const [deletingShopId, setDeletingShopId] = useState(null)
    const [shopToDelete, setShopToDelete] = useState(null)
    const [newShop, setNewShop] = useState({
        name: '',
        category_id: null,
        region_id: null,
        district_id: null,
        street_id: null,
        location: ''
    })
    const [formErrors, setFormErrors] = useState({})

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

    const loadCategories = async () => {
        const list = await categoriesApi.getCategories()
        setCategories(list)
        setNewShop(prev => ({
            ...prev,
            category_id: prev.category_id ?? list?.[0]?.id ?? null
        }))
    }

    const openAddModal = async () => {
        setIsAddModalOpen(true)
        setFormErrors({})
        if (categories.length === 0) {
            await loadCategories()
        }
    }

    const closeAddModal = () => {
        setIsAddModalOpen(false)
        setSavingShop(false)
        setFormErrors({})
        setNewShop({
            name: '',
            category_id: categories?.[0]?.id ?? null,
            region_id: null,
            district_id: null,
            street_id: null,
            location: ''
        })
    }

    const handleCreateShop = async (e) => {
        e.preventDefault()
        setSavingShop(true)
        setFormErrors({})
        try {
            await tenantsApi.createTenant({
                name: newShop.name.trim(),
                category_id: newShop.category_id,
                region_id: newShop.region_id,
                district_id: newShop.district_id,
                street_id: newShop.street_id
            })
            toast.success("Yangi biznes muvaffaqiyatli qo'shildi")
            closeAddModal()
            await loadShops()
        } catch (err) {
            const resp = err.response?.data
            if (err.response?.status === 422 && resp?.errors) {
                setFormErrors(resp.errors)
                const firstError = Object.values(resp.errors)?.[0]?.[0]
                toast.error(firstError || "Kiritilgan ma'lumotlar noto'g'ri")
            } else {
                toast.error(resp?.message || "Biznes qo'shishda xatolik yuz berdi")
            }
        } finally {
            setSavingShop(false)
        }
    }

    const setAsActive = async (id) => {
        const loadingToast = toast.loading("Faol do'kon o'zgartirilmoqda...")
        try {
            await tenantsApi.setActiveTenant(id)
            setActiveId(id)

            const shop = shops.find((item) => item.id === id)
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            user.tenant_id = id
            if (shop) {
                user.tenant_name = shop.name
                user.shop_name = shop.name
                user.tenant = { ...(user.tenant || {}), name: shop.name }
            }
            localStorage.setItem('user', JSON.stringify(user))

            toast.success("Faol do'kon o'zgartirildi", { id: loadingToast })
            setTimeout(() => {
                navigate('/')
            }, 500)
        } catch (e) {
            toast.error("Xatolik yuz berdi", { id: loadingToast })
        }
    }

    const getShopLocationLabel = (shop) => {
        const parts = []
        if (shop.location) {
            return shop.location
        }
        if (shop.region) parts.push(shop.region)
        if (shop.district) parts.push(shop.district)
        if (shop.street) parts.push(shop.street)
        return parts.join(', ')
    }

    const handleNewShopLocationChange = (address) => {
        setNewShop((prev) => ({ ...prev, location: address }))
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

    const requestDeleteShop = (shop) => {
        setShopToDelete(shop)
    }

    const confirmDeleteShop = async () => {
        if (!shopToDelete) return
        const shop = shopToDelete
        setDeletingShopId(shop.id)
        try {
            const response = await tenantsApi.deleteTenant(shop.id)
            const updatedTenants = Array.isArray(response?.tenants) ? response.tenants : null
            const nextActiveTenantId = response?.active_tenant_id ?? null

            if (updatedTenants) {
                setShops(updatedTenants)
                setActiveId(nextActiveTenantId)
            } else {
                setShops((prev) => prev.filter((s) => s.id !== shop.id))
                if (activeId === shop.id) {
                    setActiveId(null)
                }
            }

            const user = JSON.parse(localStorage.getItem('user') || '{}')
            user.tenant_id = nextActiveTenantId
            localStorage.setItem('user', JSON.stringify(user))

            toast.success(response?.message || "Biznes muvaffaqiyatli o'chirildi")
        } catch (err) {
            if (err.response?.status === 403) {
                toast.error("Bu biznesni o'chirish huquqi yo'q")
            } else if (err.response?.status === 404) {
                toast.error("Biznes topilmadi")
            } else {
                toast.error(err.response?.data?.message || "Biznesni o'chirishda xatolik yuz berdi")
            }
        } finally {
            setDeletingShopId(null)
            setShopToDelete(null)
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
                        onClick={handleBack}
                        className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft size={22} className="text-gray-700 dark:text-gray-300" />
                    </button>
                    <h1 className="flex-1 text-[17px] font-bold text-gray-900 dark:text-white truncate">
                        Mening do'konlarim
                    </h1>
                    <button
                        onClick={openAddModal}
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
                        const locationLabel = getShopLocationLabel(shop)
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
                                    {locationLabel && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-gray-500 dark:text-gray-400">
                            <MapPin size={13} />
                            <span className="text-[12px]">{locationLabel}</span>
                        </div>
                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    requestDeleteShop(shop)
                                }}
                                disabled={deletingShopId === shop.id}
                                className={`absolute top-3 ${isActive ? 'right-12' : 'right-3'} w-9 h-9 rounded-xl bg-white/70 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors`}
                                title="Biznesni o'chirish"
                            >
                                {deletingShopId === shop.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                        </div>
                    )})}
                </div>
            </div>

            <Drawer.Root open={isAddModalOpen} onOpenChange={(open) => !open && closeAddModal()} repositionInputs={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
                    <Drawer.Content className="fixed bg-white dark:bg-gray-900 bottom-0 left-0 right-0 max-h-[90vh] rounded-t-[28px] z-50 flex flex-col focus:outline-none">
                        <Drawer.Title className="sr-only">Yangi biznes qo'shish</Drawer.Title>
                        <Drawer.Description className="sr-only">Yangi do'kon ma'lumotlarini kiriting</Drawer.Description>
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 my-4" />

                        <div className="w-full max-w-md mx-auto px-5 pb-8 overflow-y-auto">
                            <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 pb-3 mb-2 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Yangi biznes qo'shish</h3>
                                    <p className="text-[12px] text-gray-500 dark:text-gray-400">Majburiy maydonlarni to'ldiring</p>
                                </div>
                                <button
                                    onClick={closeAddModal}
                                    className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateShop} className="space-y-4">
                                <div>
                                    <label className="label">Biznes nomi</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newShop.name}
                                        onChange={(e) => setNewShop(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Masalan: Nurli Zamin"
                                        required
                                    />
                                    {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name[0]}</p>}
                                </div>

                                <div>
                                    <label className="label">Faoliyat turi (kategoriya)</label>
                                    <select
                                        className="input"
                                        value={newShop.category_id ?? ''}
                                        onChange={(e) => setNewShop(prev => ({
                                            ...prev,
                                            category_id: e.target.value ? parseInt(e.target.value, 10) : null
                                        }))}
                                        required
                                    >
                                        <option value="">Tanlang...</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                    {formErrors.category_id && <p className="text-red-500 text-xs mt-1">{formErrors.category_id[0]}</p>}
                                </div>

                                <LocationSelector
                                    value={{
                                        region_id: newShop.region_id,
                                        district_id: newShop.district_id,
                                        street_id: newShop.street_id
                                    }}
                                    onChange={(location) => setNewShop(prev => ({ ...prev, ...location }))}
                                    onAddressChange={handleNewShopLocationChange}
                                    required
                                />
                                {newShop.location ? (
                                    <div className="space-y-1">
                                        <label className="label">Tanlangan manzil</label>
                                        <input
                                            type="text"
                                            className="input bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                                            value={newShop.location}
                                            readOnly
                                            disabled
                                        />
                                    </div>
                                ) : null}
                                {formErrors.region_id && <p className="text-red-500 text-xs mt-1">{formErrors.region_id[0]}</p>}
                                {formErrors.district_id && <p className="text-red-500 text-xs mt-1">{formErrors.district_id[0]}</p>}
                                {formErrors.street_id && <p className="text-red-500 text-xs mt-1">{formErrors.street_id[0]}</p>}

                                <button
                                    type="submit"
                                    disabled={savingShop || !newShop.name.trim() || !newShop.category_id || !newShop.region_id || !newShop.district_id || !newShop.street_id}
                                    className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 ${
                                        savingShop || !newShop.name.trim() || !newShop.category_id || !newShop.region_id || !newShop.district_id || !newShop.street_id
                                            ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    }`}
                                >
                                    {savingShop ? <Loader2 size={18} className="animate-spin" /> : "Biznesni qo'shish"}
                                </button>
                            </form>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {shopToDelete && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-2xl p-5">
                        <h4 className="text-[17px] font-bold text-gray-900 dark:text-white mb-2">
                            Biznesni o'chirish
                        </h4>
                        <p className="text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
                            <span className="font-semibold">"{shopToDelete.name}"</span> biznesini o'chirmoqchimisiz?
                            Bu amalni ortga qaytarib bo'lmaydi.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShopToDelete(null)}
                                disabled={deletingShopId === shopToDelete.id}
                                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold"
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteShop}
                                disabled={deletingShopId === shopToDelete.id}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {deletingShopId === shopToDelete.id ? <Loader2 size={16} className="animate-spin" /> : null}
                                O'chirish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
