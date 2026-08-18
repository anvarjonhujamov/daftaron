import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Drawer } from 'vaul'
import { tenantsApi } from '../api/tenants.api'
import { categoriesApi } from '../api/categories.api'
import { Store, Plus, ArrowLeft, MapPin, CheckCircle2, X, Loader2, Trash2, Edit2, ShieldAlert, Database, Clock, Send, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import LocationSelector from '../components/LocationSelector'

const CAT_CACHE_KEY = 'loc_categories_v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 48

const loadCache = (key) => {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || !parsed.t) return null
        if (Date.now() - parsed.t > CACHE_TTL_MS) {
            localStorage.removeItem(key)
            return null
        }
        return parsed.d
    } catch { return null }
}
const saveCache = (key, data) => {
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })) } catch {}
}

const numOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : null
}

const pickId = (nested, flat) => {
    const fromNested = typeof nested === 'object' && nested && nested.id ? numOrNull(nested.id) : null
    return fromNested ?? numOrNull(flat) ?? null
}
const pickName = (nested, flatName, flatId) => {
    if (typeof nested === 'object' && nested?.name) return String(nested.name)
    if (typeof nested === 'string' && nested) return nested
    if (flatName) return String(flatName)
    if (flatId != null) return String(flatId)
    return ''
}

export default function ShopsPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [shops, setShops] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeId, setActiveId] = useState(null)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [categories, setCategories] = useState([])
    const [savingShop, setSavingShop] = useState(false)
    const [savingEditShop, setSavingEditShop] = useState(false)

    const [newShop, setNewShop] = useState({
        name: '',
        category_id: null,
        category_name: '',
        region_id: null,
        region_name: '',
        district_id: null,
        district_name: '',
        street_id: null,
        street_name: '',
        location: ''
    })

    const [editShopForm, setEditShopForm] = useState({
        name: '',
        category_id: null,
        category_name: '',
        region_id: null,
        region_name: '',
        district_id: null,
        district_name: '',
        street_id: null,
        street_name: '',
        location: ''
    })

    const [loadingEdit, setLoadingEdit] = useState(false)
    const [editingShopId, setEditingShopId] = useState(null)
    const [formErrors, setFormErrors] = useState({})
    const [editFormErrors, setEditFormErrors] = useState({})

    // ========= DELETE / PURGE FLOW (TZ 17.6) =========
    const [shopToDelete, setShopToDelete] = useState(null) // confirm modal
    const [purgeTenant, setPurgeTenant] = useState(null) // active tenant during SMS
    const [purgeSending, setPurgeSending] = useState(false)
    const [purgeCode, setPurgeCode] = useState('')
    const [purgeConfirming, setPurgeConfirming] = useState(false)
    const [purgeCountdown, setPurgeCountdown] = useState(0)
    const [purgePhone, setPurgePhone] = useState('')
    const purgeTimerRef = useRef(null)

    useEffect(() => {
        loadShops()
        loadCategoriesCacheFirst()
    }, [])

    useEffect(() => {
        return () => {
            if (purgeTimerRef.current) clearInterval(purgeTimerRef.current)
        }
    }, [])

    const loadCategoriesCacheFirst = async () => {
        const cached = loadCache(CAT_CACHE_KEY)
        if (Array.isArray(cached) && cached.length) {
            setCategories(cached)
        }
        try {
            const list = await categoriesApi.getCategories()
            if (Array.isArray(list) && list.length) {
                setCategories(list)
                saveCache(CAT_CACHE_KEY, list)
            }
        } catch (e) {
            console.warn('loadCategoriesCacheFirst fetch failed, using cache', e)
        }
    }

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
        if (list.length) saveCache(CAT_CACHE_KEY, list)
        setNewShop(prev => ({
            ...prev,
            category_id: prev.category_id ?? list?.[0]?.id ?? null,
            category_name: prev.category_name || list?.[0]?.name || ''
        }))
    }

    const openAddModal = async () => {
        setIsAddModalOpen(true)
        setFormErrors({})
        if (categories.length === 0) {
            try { await loadCategories() } catch {}
        }
    }

    const closeAddModal = () => {
        setIsAddModalOpen(false)
        setSavingShop(false)
        setFormErrors({})
        setNewShop({
            name: '',
            category_id: categories?.[0]?.id ?? null,
            category_name: categories?.[0]?.name || '',
            region_id: null,
            region_name: '',
            district_id: null,
            district_name: '',
            street_id: null,
            street_name: '',
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
            setTimeout(() => { navigate('/') }, 500)
        } catch (e) {
            toast.error("Xatolik yuz berdi", { id: loadingToast })
        }
    }

    const getShopLocationLabel = (shop) => {
        const parts = []
        if (shop.location) return shop.location
        const r = shop.region_name || (typeof shop.region === 'string' ? shop.region : shop.region?.name)
        const d = shop.district_name || (typeof shop.district === 'string' ? shop.district : shop.district?.name)
        const s = shop.street_name || (typeof shop.street === 'string' ? shop.street : shop.street?.name)
        if (r) parts.push(r)
        if (d) parts.push(d)
        if (s) parts.push(s)
        return parts.join(', ')
    }

    const handleNewShopLocationChange = (address) => {
        setNewShop((prev) => ({ ...prev, location: address }))
    }

    const handleBack = () => {
        const from = location.state?.from
        if (from) { navigate(from); return }
        if (window.history.length > 1) { navigate(-1); return }
        navigate('/')
    }

    // ========= openEditModal — FULL RESOLVE: list base + GET single merge =========
    const openEditModal = async (shop) => {
        setEditFormErrors({})
        setEditingShopId(shop?.id ?? null)
        setLoadingEdit(true)

        if (categories.length === 0) {
            try { await loadCategories() } catch {}
        }

        let merged = { ...shop }
        try {
            if (shop?.id) {
                const fetched = await tenantsApi.getTenant(shop.id)
                if (fetched && typeof fetched === 'object') {
                    merged = { ...shop, ...fetched }
                }
            }
        } catch (err) {
            console.warn('[openEditModal] getTenant fallback list data', err?.response?.status)
        }

        // Parse comma-separated location string if ID+NAME fields are missing
        const rawLocation = String(merged?.location || merged?.address || '')
        let parsedRegionName = ''
        let parsedDistrictName = ''
        let parsedStreetName = ''
        if (rawLocation && rawLocation.includes(',')) {
            const parts = rawLocation.split(',').map(s => s.trim()).filter(Boolean)
            parsedRegionName = parts[0] || ''
            parsedDistrictName = parts[1] || ''
            parsedStreetName = parts.slice(2).join(', ') || ''
        }

        const rIdRaw = pickId(merged?.region, merged?.region_id)
        const rNameRaw = pickName(merged?.region, merged?.region_name, rIdRaw)
        const dIdRaw = pickId(merged?.district, merged?.district_id)
        const dNameRaw = pickName(merged?.district, merged?.district_name, dIdRaw)
        const sIdRaw = pickId(merged?.street, merged?.street_id)
        const sNameRaw = pickName(merged?.street, merged?.street_name, sIdRaw)

        const rName = rNameRaw || parsedRegionName
        const dName = dNameRaw || parsedDistrictName
        const sName = sNameRaw || parsedStreetName

        const catIdRaw = pickId(merged?.category, merged?.category_id)
        const catNameRaw = pickName(merged?.category, merged?.category_name, catIdRaw)
        // If ID missing but NAME present → try to find by NAME in categories array
        let catId = catIdRaw
        let catName = catNameRaw
        if (catId == null && catName) {
            const byName = categories.find((c) => {
                const cn = String(c?.name || '').trim().toLowerCase()
                const tn = String(catName).trim().toLowerCase()
                return cn && tn && (cn === tn || cn.includes(tn) || tn.includes(cn))
            })
            if (byName?.id) {
                catId = numOrNull(byName.id)
            }
        }
        // Name fallback from array if we have catId but no catName
        if (!catName && catId != null) {
            catName = categories.find((c) => numOrNull(c.id) === catId)?.name || ''
        }

        setEditShopForm({
            name: String(merged?.name || merged?.shop_name || ''),
            category_id: catId ?? null,
            category_name: catName || '',
            region_id: rIdRaw,
            region_name: rName,
            district_id: dIdRaw,
            district_name: dName,
            street_id: sIdRaw,
            street_name: sName,
            location: rawLocation || getShopLocationLabel({
                ...merged,
                region_name: rName, district_name: dName, street_name: sName
            }) || ''
        })

        setLoadingEdit(false)
        setIsEditModalOpen(true)
    }

    const closeEditModal = () => {
        setIsEditModalOpen(false)
        setEditingShopId(null)
        setEditFormErrors({})
        setEditShopForm({ name: '', category_id: categories?.[0]?.id ?? null, category_name: categories?.[0]?.name || '', region_id: null, region_name: '', district_id: null, district_name: '', street_id: null, street_name: '', location: '' })
    }

    const handleUpdateShop = async (e) => {
        e.preventDefault()
        if (!editingShopId) return
        setSavingEditShop(true)
        setEditFormErrors({})
        try {
            const payload = {
                name: editShopForm.name.trim(),
                category_id: editShopForm.category_id ?? null,
                region_id: editShopForm.region_id ?? null,
                district_id: editShopForm.district_id ?? null,
                street_id: editShopForm.street_id ?? null
            }
            await tenantsApi.updateTenant(editingShopId, payload)
            toast.success("Biznes ma'lumotlari yangilandi")
            closeEditModal()
            await loadShops()
        } catch (err) {
            const resp = err.response?.data
            if (err.response?.status === 422 && resp?.errors) {
                setEditFormErrors(resp.errors)
                const firstError = Object.values(resp.errors)?.[0]?.[0]
                toast.error(firstError || "Kiritilgan ma'lumotlar noto'g'ri")
            } else {
                toast.error(resp?.message || "Biznesni yangilashda xatolik yuz berdi")
            }
        } finally {
            setSavingEditShop(false)
        }
    }

    // ========= DELETE / PURGE =========
    const requestDeleteShop = (shop) => {
        setShopToDelete(shop)
    }

    const startPurgeFlow = async () => {
        if (!shopToDelete?.id) return
        setPurgeTenant(shopToDelete)
        setShopToDelete(null)
        setPurgeCode('')
        setPurgeConfirming(false)
        setPurgeSending(true)
        try {
            const data = await tenantsApi.purgeRequest(shopToDelete.id)
            setPurgePhone(data?.phone || '')
            const ttl = Number(data?.code_ttl_minutes || 10)
            setPurgeCountdown(ttl * 60)
            if (purgeTimerRef.current) clearInterval(purgeTimerRef.current)
            purgeTimerRef.current = setInterval(() => {
                setPurgeCountdown((prev) => {
                    if (prev <= 1) {
                        if (purgeTimerRef.current) clearInterval(purgeTimerRef.current)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            toast.success("Tasdiqlash kodi SMS orqali yuborildi")
        } catch (err) {
            toast.error(err?.response?.data?.message || "SMS yuborishda xatolik yuz berdi")
            setPurgeTenant(null)
        } finally {
            setPurgeSending(false)
        }
    }

    const resendPurgeCode = async () => {
        if (!purgeTenant?.id || purgeCountdown > 0 || purgeSending) return
        setPurgeSending(true)
        try {
            const data = await tenantsApi.purgeRequest(purgeTenant.id)
            setPurgePhone(data?.phone || purgePhone)
            const ttl = Number(data?.code_ttl_minutes || 10)
            setPurgeCountdown(ttl * 60)
            toast.success("Yangi kod yuborildi")
        } catch (err) {
            toast.error(err?.response?.data?.message || "Qayta yuborishda xatolik")
        } finally {
            setPurgeSending(false)
        }
    }

    const confirmPurgeCode = async () => {
        if (!purgeTenant?.id) return
        if (!purgeCode || purgeCode.length !== 4) {
            toast.error('4 xonali kodni kiriting')
            return
        }
        setPurgeConfirming(true)
        try {
            const data = await tenantsApi.purgeConfirm(purgeTenant.id, purgeCode)
            toast.success(data?.message || "Do'kon ma'lumotlari tozalandi")
            const s = data?.summary || {}
            if (typeof s === 'object' && Object.keys(s).length) {
                const parts = []
                if (s.deleted_customers_count) parts.push(`Mijozlar: ${s.deleted_customers_count}`)
                if (s.deleted_debts_count) parts.push(`Nasiyalar: ${s.deleted_debts_count}`)
                if (s.deleted_payments_count) parts.push(`To'lovlar: ${s.deleted_payments_count}`)
                if (parts.length) {
                    setTimeout(() => toast.success(parts.join(', ')), 600)
                }
            }
            await loadShops()
            closePurgeFlow()
        } catch (err) {
            const resp = err?.response?.data || {}
            const msg = resp?.message || "Tasdiqlashda xatolik"
            if (resp?.errors?.code) {
                toast.error(resp.errors.code[0] || msg)
            } else {
                toast.error(msg)
            }
            if (err?.response?.status === 404) {
                setPurgeCountdown(0)
            }
        } finally {
            setPurgeConfirming(false)
        }
    }

    const closePurgeFlow = () => {
        if (purgeTimerRef.current) clearInterval(purgeTimerRef.current)
        setPurgeTenant(null)
        setPurgeCode('')
        setPurgePhone('')
        setPurgeCountdown(0)
    }

    const purgeCountdownLabel = useMemo(() => {
        const m = Math.floor(purgeCountdown / 60)
        const s = purgeCountdown % 60
        if (purgeCountdown <= 0) return 'Kod muddati tugagan'
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }, [purgeCountdown])

    const renderCategorySelect = (value_id, value_name, onChange, errors, mode) => {
        const numericId = numOrNull(value_id)
        const resolved = useMemo(() => {
            if (numericId != null) {
                const m = categories.find((c) => numOrNull(c.id) === numericId)
                if (m) return { id: numericId, name: m.name || value_name || '', type: 'id' }
            }
            if (value_name) {
                const nameClean = String(value_name).trim().toLowerCase()
                const byName = categories.find((c) => {
                    const cn = String(c?.name || '').trim().toLowerCase()
                    return cn && nameClean && (cn === nameClean || cn.includes(nameClean) || nameClean.includes(cn))
                })
                if (byName?.id) {
                    return { id: numOrNull(byName.id), name: byName.name || value_name, type: 'name-match' }
                }
                return { id: null, name: value_name, type: 'synthetic-name' }
            }
            return { id: null, name: '', type: 'empty' }
        }, [categories, numericId, value_name])

        const effectiveId = resolved.id
        const effectiveName = resolved.name || value_name || ''
        const needsSynthetic = (resolved.type === 'synthetic-name') || (effectiveId != null && !categories.some((c) => numOrNull(c.id) === effectiveId))
        const syntheticKey = (resolved.type === 'synthetic-name')
            ? `s-cat-${mode}-name-${btoa(effectiveName).slice(0, 8)}`
            : `s-cat-${mode}-${effectiveId}-${btoa(effectiveName).slice(0, 6)}`
        const syntheticValue = (resolved.type === 'synthetic-name')
            ? `__name:${encodeURIComponent(effectiveName)}`
            : String(effectiveId)
        const selectValue = effectiveId != null ? String(effectiveId) : (needsSynthetic ? syntheticValue : '')

        return (
            <div>
                <label className="label">Faoliyat turi (kategoriya)</label>
                <select
                    className="input"
                    value={selectValue}
                    onChange={(e) => {
                        const v = e.target.value
                        if (!v) { onChange(null, ''); return }
                        if (v.startsWith('__name:')) {
                            const decoded = decodeURIComponent(v.slice(7))
                            onChange(null, decoded)
                            return
                        }
                        const id = parseInt(v, 10)
                        const name = categories.find((c) => numOrNull(c.id) === id)?.name || value_name || ''
                        onChange(Number.isFinite(id) ? id : null, name)
                    }}
                    required
                >
                    <option value="">Tanlang...</option>
                    {needsSynthetic && (
                        <option key={syntheticKey} value={syntheticValue}>
                            {effectiveName || 'Tanlangan kategoriya'}
                        </option>
                    )}
                    {categories.map((cat) => (
                        <option key={`cat-${mode}-${cat.id}`} value={String(cat.id)}>{cat.name}</option>
                    ))}
                </select>
                {errors?.category_id && <p className="text-red-500 text-xs mt-1">{errors.category_id[0]}</p>}
            </div>
        )
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
                                <div className="absolute top-3 right-3 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openEditModal(shop); }}
                                        className="w-9 h-9 rounded-xl bg-white/70 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                        title="Biznesni tahrirlash"
                                    >
                                        <Edit2 size={16} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            requestDeleteShop(shop)
                                        }}
                                        className={`w-9 h-9 rounded-xl bg-white/70 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors ${isActive ? 'ml-2' : ''}`}
                                        title="Do'kon ma'lumotlarini tozalash (mijozlar, nasiyalar, to'lovlar)"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* ========= ADD SHOP DRAWER ========= */}
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

                                {renderCategorySelect(
                                    newShop.category_id,
                                    newShop.category_name,
                                    (id, name) => setNewShop(prev => ({ ...prev, category_id: id, category_name: name })),
                                    formErrors,
                                    'new'
                                )}

                                <LocationSelector
                                    value={{
                                        region_id: newShop.region_id,
                                        region_name: newShop.region_name,
                                        district_id: newShop.district_id,
                                        district_name: newShop.district_name,
                                        street_id: newShop.street_id,
                                        street_name: newShop.street_name
                                    }}
                                    onChange={(location) => setNewShop(prev => ({ ...prev, ...location }))}
                                    onAddressChange={handleNewShopLocationChange}
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
                                    disabled={savingShop || !newShop.name.trim() || !newShop.category_id}
                                    className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 ${
                                        savingShop || !newShop.name.trim() || !newShop.category_id
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

            {/* ========= EDIT SHOP DRAWER ========= */}
            <Drawer.Root open={isEditModalOpen} onOpenChange={(open) => { if (!open) closeEditModal() }} repositionInputs={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
                    <Drawer.Content className="fixed bg-white dark:bg-gray-900 bottom-0 left-0 right-0 max-h-[90vh] rounded-t-[28px] z-50 flex flex-col focus:outline-none">
                        <Drawer.Title className="sr-only">Do'konni tahrirlash</Drawer.Title>
                        <Drawer.Description className="sr-only">Do'kon ma'lumotlarini yangilang</Drawer.Description>
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 my-4" />

                        <div className="w-full max-w-md mx-auto px-5 pb-8 overflow-y-auto">
                            <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 pb-3 mb-2 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">Do'konni tahrirlash</h3>
                                    <p className="text-[12px] text-gray-500 dark:text-gray-400">Do'kon ma'lumotlarini yangilang</p>
                                </div>
                                <button
                                    onClick={closeEditModal}
                                    className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {loadingEdit && (
                                <div className="py-8 flex flex-col items-center gap-3 text-gray-500">
                                    <Loader2 size={28} className="animate-spin" />
                                    <p className="text-sm">Ma'lumotlar yuklanmoqda...</p>
                                </div>
                            )}

                            {!loadingEdit && (
                                <form onSubmit={handleUpdateShop} className="space-y-4">
                                    <div>
                                        <label className="label">Biznes nomi</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={editShopForm.name}
                                            onChange={(e) => setEditShopForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Masalan: Nurli Zamin"
                                            required
                                        />
                                        {editFormErrors.name && <p className="text-red-500 text-xs mt-1">{editFormErrors.name[0]}</p>}
                                    </div>

                                    {renderCategorySelect(
                                        editShopForm.category_id,
                                        editShopForm.category_name,
                                        (id, name) => setEditShopForm(prev => ({ ...prev, category_id: id, category_name: name })),
                                        editFormErrors,
                                        'edit'
                                    )}

                                    <LocationSelector
                                        value={{
                                            region_id: editShopForm.region_id,
                                            region_name: editShopForm.region_name,
                                            district_id: editShopForm.district_id,
                                            district_name: editShopForm.district_name,
                                            street_id: editShopForm.street_id,
                                            street_name: editShopForm.street_name
                                        }}
                                        onChange={(loc) => setEditShopForm(prev => ({ ...prev, ...loc }))}
                                        onAddressChange={(addr) => setEditShopForm(prev => ({ ...prev, location: addr }))}
                                    />
                                    {editShopForm.location ? (
                                        <div className="space-y-1">
                                            <label className="label">Tanlangan manzil</label>
                                            <input
                                                type="text"
                                                className="input bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                                                value={editShopForm.location}
                                                readOnly
                                                disabled
                                            />
                                        </div>
                                    ) : null}

                                    <button
                                        type="submit"
                                        disabled={savingEditShop || !editShopForm.name.trim() || !editShopForm.category_id}
                                        className={`w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 ${savingEditShop || !editShopForm.name.trim() || !editShopForm.category_id ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                    >
                                        {savingEditShop ? <Loader2 size={18} className="animate-spin" /> : "Saqlash"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            {/* ========= DELETE CONFIRM MODAL ========= */}
            {shopToDelete && (
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-2xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle size={22} className="text-red-500" />
                            </div>
                            <div>
                                <h4 className="text-[17px] font-bold text-gray-900 dark:text-white">
                                    Do'konni tozalash
                                </h4>
                                <p className="text-[12px] text-gray-500 dark:text-gray-400">
                                    Ortga qaytarib bo'lmaydigan amal
                                </p>
                            </div>
                        </div>
                        <p className="text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                            <span className="font-semibold">"{shopToDelete.name}"</span> uchun <b>barcha mijozlar, nasiyalar, to'lovlar va SMS loglarini</b> o'chirishni xohlaysizmi?
                        </p>
                        <div className="space-y-2 mb-5">
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
                                <Database size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="text-[12px] text-red-700 dark:text-red-400/90">
                                    <p className="font-semibold mb-1">O'chiriladiganlar:</p>
                                    <ul className="space-y-0.5 list-disc pl-4">
                                        <li>Barcha mijozlar</li>
                                        <li>Nasiyalar (qarzdorliklar)</li>
                                        <li>To'lovlar tarixi</li>
                                        <li>SMS jo'natish loglari</li>
                                    </ul>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                <ShieldAlert size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                                <div className="text-[12px] text-emerald-700 dark:text-emerald-400/90">
                                    <p><b>Saqlanadi:</b> Do'konning o'zi, nomi, faoliyati turi, joylashuvi.</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setShopToDelete(null)}
                                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold active:opacity-80"
                            >
                                Bekor qilish
                            </button>
                            <button
                                type="button"
                                onClick={startPurgeFlow}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-70 active:opacity-90"
                            >
                                O'chirish
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========= PURGE SMS VERIFY DRAWER ========= */}
            <Drawer.Root open={!!purgeTenant} onOpenChange={(open) => { if (!open && !purgeConfirming) closePurgeFlow() }} repositionInputs={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
                    <Drawer.Content className="fixed bg-white dark:bg-gray-900 bottom-0 left-0 right-0 max-h-[90vh] rounded-t-[28px] z-50 flex flex-col focus:outline-none">
                        <Drawer.Title className="sr-only">Tasdiqlash kodini kiriting</Drawer.Title>
                        <Drawer.Description className="sr-only">SMS orqali yuborilgan 4 xonali kodni kiriting</Drawer.Description>
                        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700 my-4" />

                        <div className="w-full max-w-md mx-auto px-5 pb-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                        <Send size={22} className="text-indigo-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">
                                            SMS tasdiqlash
                                        </h3>
                                        <p className="text-[12px] text-gray-500 dark:text-gray-400">
                                            {purgeTenant?.name}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={closePurgeFlow}
                                    disabled={purgeConfirming}
                                    className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <p className="text-[14px] text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                                <b>{purgePhone || 'Sizning telefon raqamingiz'}</b> ga 4 xonali tasdiqlash kodi yuborildi. Kodni kiriting va tozalashni tasdiqlang.
                            </p>

                            <div className="mb-4">
                                <label className="label">Tasdiqlash kodi</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    placeholder="4 xonali kod"
                                    className="input text-center text-2xl tracking-[0.5em] font-bold tracking-widest"
                                    value={purgeCode}
                                    onChange={(e) => setPurgeCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') void confirmPurgeCode() }}
                                    disabled={purgeConfirming}
                                    autoFocus
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-gray-400">
                                        <Clock size={13} />
                                        <span>{purgeCountdownLabel}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={resendPurgeCode}
                                        disabled={purgeCountdown > 0 || purgeSending}
                                        className="text-[12px] font-semibold text-blue-500 disabled:text-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {purgeSending ? 'Yuborilmoqda...' : 'Qayta yuborish'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={closePurgeFlow}
                                    disabled={purgeConfirming}
                                    className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold"
                                >
                                    Bekor qilish
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmPurgeCode}
                                    disabled={purgeConfirming || !purgeCode || purgeCode.length !== 4}
                                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {purgeConfirming ? <Loader2 size={18} className="animate-spin" /> : null}
                                    Tasdiqlash
                                </button>
                            </div>

                            <p className="mt-4 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                                Test/dev muhitida default kod: <b>1234</b>. Maksimal urinish: <b>3 ta</b>.
                            </p>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    )
}
