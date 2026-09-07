import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { suppliersApi } from '../api/suppliers.api'
import {
    Building2, UserPlus, ArrowLeft, MoreVertical,
    Trash2, Edit2, AlertCircle, Loader2, Search, Eye,
    Phone, User, MapPin, FileText, Hash, TrendingDown, TrendingUp, Package, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import SupplierModal from '../components/SupplierModal'
import { parseCurrency, formatCurrency } from '../utils/format'

export default function SuppliersPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState(null)
    const [deletingId, setDeletingId] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [errorState, setErrorState] = useState(null)

    const pickStr = (obj, keys, fallback = null) => {
        if (!obj || typeof obj !== 'object') return fallback
        for (const k of keys) {
            const v = obj[k]
            if (v !== undefined && v !== null && String(v).trim() !== '') return v
            if (k.includes('.')) {
                const parts = k.split('.')
                let cur = obj
                for (const p of parts) { cur = cur?.[p]; if (cur === undefined) break }
                if (cur !== undefined && cur !== null && String(cur).trim() !== '') return cur
            }
        }
        return fallback
    }

    const pickNum = (obj, keys, fallback = 0) => {
        if (!obj || typeof obj !== 'object') return fallback
        for (const k of keys) {
            const v = obj[k]
            if (v === undefined || v === null || v === '') continue
            const n = Number(v)
            if (!Number.isNaN(n)) return n
        }
        return fallback
    }

    const normalizeSupplier = (raw) => {
        if (!raw) return raw
        return {
            ...raw,
            id: raw.id ?? raw.supplier_id ?? raw.uuid ?? raw._id,
            name: pickStr(raw, ['name', 'company_name', 'full_name', 'title', 'organization_name', 'supplier_name', 'partner_name']),
            company_name: pickStr(raw, ['company_name', 'name', 'organization']),
            phone: pickStr(raw, ['phone', 'tel', 'mobile', 'telephone', 'phone_number', 'contact_phone']),
            contact_person: pickStr(raw, ['contact_person', 'contact', 'manager_name', 'responsible', 'representative', 'person', 'owner', 'contact_name']),
            inn: pickStr(raw, ['inn', 'stir', 'tin', 'inn_stir', 'tin_inn', 'tax_id', 'taxpayer_id']),
            stir: pickStr(raw, ['stir', 'inn', 'tin']),
            address: pickStr(raw, ['address', 'location', 'region_name', 'full_address']),
            note: pickStr(raw, ['note', 'notes', 'comment', 'description', 'extra']),
            status: pickStr(raw, ['status', 'state', 'active_status'], 'active'),
            balance: pickNum(raw, ['balance', 'current_debt', 'debt', 'debt_amount', 'remaining', 'remaining_amount', 'payable', 'total_debt', 'overdue_amount']),
            current_debt: pickNum(raw, ['current_debt', 'debt', 'balance', 'debt_amount']),
            total_bought: pickNum(raw, ['total_bought', 'purchased', 'total_purchase', 'amount_bought']),
            total_paid: pickNum(raw, ['total_paid', 'paid', 'payment_total', 'amount_paid']),
            created_at: raw.created_at ?? raw.createdAt ?? raw.date ?? null,
            updated_at: raw.updated_at ?? raw.updatedAt ?? null
        }
    }

    const getActiveTenantId = () => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            return user?.tenant_id || null
        } catch {
            return null
        }
    }

    useEffect(() => {
        loadSuppliers()
    }, [])

    const loadSuppliers = async () => {
        setLoading(true)
        setErrorState(null)
        try {
            suppliersApi._resetDetection()
            const response = await suppliersApi.getSuppliers()
            const raw = Array.isArray(response) ? response : (response?.data || [])
            const data = raw.map(normalizeSupplier)
            setSuppliers(data)

            if (data.length > 0) {
                loadComputedBalances(data)
            }
        } catch (err) {
            console.error('Failed to load suppliers:', err)
            const status = err.response?.status || 0
            const msg = err.response?.data?.message || err.message || 'Postavchiklar yuklanmadi'
            setErrorState({ code: status, message: msg })
            setSuppliers([])
        } finally {
            setLoading(false)
        }
    }

    const loadComputedBalances = async (suppliersArray) => {
        try {
            // Step 0: Darhol (sync) cache restore o'qilishi — oldingi ochilishdagi balanslar darhol
            try {
                const cacheRaw = typeof window !== 'undefined' ? window.localStorage.getItem('suppliers_page_balances_cache_v1') : null
                if (cacheRaw) {
                    const cache = JSON.parse(cacheRaw) || {}
                    const withInstant = suppliersArray.map(s => {
                        const c = cache[String(s.id)]
                        if (!c) return s
                        return {
                            ...s,
                            computed_total_bought: c.computed_total_bought ?? s.computed_total_bought,
                            computed_total_paid: c.computed_total_paid ?? s.computed_total_paid,
                            computed_balance: c.computed_balance ?? s.computed_balance,
                        }
                    })
                    setSuppliers(prev => {
                        const map = new Map()
                        prev.forEach(p => map.set(String(p.id), p))
                        withInstant.forEach(w => {
                            const sid = String(w.id)
                            const existing = map.get(sid)
                            if (existing) {
                                map.set(sid, {
                                    ...existing,
                                    computed_total_bought: w.computed_total_bought ?? existing.computed_total_bought,
                                    computed_total_paid: w.computed_total_paid ?? existing.computed_total_paid,
                                    computed_balance: w.computed_balance ?? existing.computed_balance,
                                })
                            } else {
                                map.set(sid, w)
                            }
                        })
                        return Array.from(map.values())
                    })
                }
            } catch (e) { /* ignore cache read */ }

            // Step 1: Synchronous — faqat LS dan o'qish (200 supplier uchun ham 1ms)
            const lsOnly = suppliersArray.map(s => {
                let totalBought = 0
                let totalPaid = 0
                try {
                    const pRaw = localStorage.getItem(`supplier_${s.id}_purchases`)
                    const yRaw = localStorage.getItem(`supplier_${s.id}_payments`)
                    const pl = pRaw ? JSON.parse(pRaw) : []
                    const yl = yRaw ? JSON.parse(yRaw) : []
                    totalBought = (Array.isArray(pl) ? pl : []).reduce((sum, r) => sum + (parseFloat(r?.amount || r?.total_amount) || 0), 0)
                    totalPaid = (Array.isArray(yl) ? yl : []).reduce((sum, r) => sum + (parseFloat(r?.amount) || 0), 0)
                } catch (e) { /* ignore parse */ }
                const initialBalanceSign = parseFloat(s?.balance ?? s?.current_debt ?? 0) || 0
                return {
                    id: s.id,
                    computed_total_bought: totalBought,
                    computed_total_paid: totalPaid,
                    computed_balance: (totalBought - totalPaid + initialBalanceSign)
                }
            })
            // Apply synchronous LS-results immediately — NO user-visible 0 flash
            if (lsOnly.some(x => (x.computed_total_bought || x.computed_total_paid))) {
                setSuppliers(prev => {
                    const map = new Map()
                    prev.forEach(p => map.set(String(p.id), p))
                    lsOnly.forEach(w => {
                        const sid = String(w.id)
                        const existing = map.get(sid)
                        if (existing) {
                            map.set(sid, {
                                ...existing,
                                computed_total_bought: w.computed_total_bought ?? existing.computed_total_bought,
                                computed_total_paid: w.computed_total_paid ?? existing.computed_total_paid,
                                computed_balance: w.computed_balance ?? existing.computed_balance,
                            })
                        }
                    })
                    return Array.from(map.values())
                })
                saveBalancesCache(lsOnly.map(x => ({ id: x.id, computed_total_bought: x.computed_total_bought, computed_total_paid: x.computed_total_paid, computed_balance: x.computed_balance })))
            }

            // Step 2: Async background — remote + LS merge; yangilash kerak bo'lsa UI ni o'zgartir
            const withRemote = await Promise.all(
                suppliersArray.map(async (s) => {
                    let totalBought = 0
                    let totalPaid = 0
                    try {
                        const [purRes, payRes] = await Promise.all([
                            suppliersApi.getSupplierPurchasesMerged(s.id).catch(() => ({ data: [] })),
                            suppliersApi.getSupplierPaymentsMerged(s.id).catch(() => ({ data: [] }))
                        ])
                        const purchases = Array.isArray(purRes) ? purRes : (purRes?.data || [])
                        const payments = Array.isArray(payRes) ? payRes : (payRes?.data || [])
                        totalBought = purchases.reduce((sum, p) => sum + (parseFloat(p?.amount || p?.total_amount) || 0), 0)
                        totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p?.amount) || 0), 0)
                    } catch (e) {
                        // fall back to lsOnly result
                        const ls = lsOnly.find(x => String(x.id) === String(s.id)) || {}
                        totalBought = ls.computed_total_bought ?? 0
                        totalPaid = ls.computed_total_paid ?? 0
                    }
                    const initialBalanceSign = parseFloat(s?.balance ?? s?.current_debt ?? 0) || 0
                    return {
                        id: s.id,
                        computed_total_bought: totalBought,
                        computed_total_paid: totalPaid,
                        computed_balance: (totalBought - totalPaid + initialBalanceSign)
                    }
                })
            )
            setSuppliers(prev => {
                const map = new Map()
                prev.forEach(p => map.set(String(p.id), p))
                withRemote.forEach(w => {
                    const sid = String(w.id)
                    const existing = map.get(sid)
                    if (existing) {
                        // skip unnecessary rerender if identical
                        if (
                            Number(existing.computed_balance) === Number(w.computed_balance) &&
                            Number(existing.computed_total_bought) === Number(w.computed_total_bought) &&
                            Number(existing.computed_total_paid) === Number(w.computed_total_paid)
                        ) return
                        map.set(sid, {
                            ...existing,
                            computed_total_bought: w.computed_total_bought,
                            computed_total_paid: w.computed_total_paid,
                            computed_balance: w.computed_balance,
                        })
                    }
                })
                return Array.from(map.values())
            })
            saveBalancesCache(withRemote)
        } catch (e) {
            console.warn('loadComputedBalances failed:', e)
        }
    }

    const saveBalancesCache = (rows) => {
        try {
            const cacheRaw = typeof window !== 'undefined' ? window.localStorage.getItem('suppliers_page_balances_cache_v1') : null
            const cache = cacheRaw ? JSON.parse(cacheRaw) : {}
            rows.forEach(r => {
                cache[String(r.id)] = {
                    computed_total_bought: r.computed_total_bought ?? 0,
                    computed_total_paid: r.computed_total_paid ?? 0,
                    computed_balance: r.computed_balance ?? 0,
                }
            })
            window.localStorage.setItem('suppliers_page_balances_cache_v1', JSON.stringify(cache))
        } catch (e) { /* ignore quota */ }
    }

    const pickSupplierField = (s, fields) => {
        if (!s) return null
        for (const k of fields) {
            const v = s[k]
            if (typeof v === 'string' && v.length > 0) return v
            if (typeof v === 'number' && !isNaN(v)) return String(v)
            if (v && typeof v === 'object') {
                for (const nk of fields) {
                    const nv = v[nk]
                    if (typeof nv === 'string' && nv.length > 0) return nv
                }
            }
        }
        return null
    }

    const getSupplierBalance = (s) => {
        if (!s) return 0
        if (s.computed_balance !== undefined && s.computed_balance !== null && !isNaN(Number(s.computed_balance))) {
            return Number(s.computed_balance)
        }
        const raw = pickSupplierField(s, ['balance', 'total_balance', 'current_balance', 'debt', 'debt_amount', 'amount_due', 'remaining_amount'])
        const num = Number(raw)
        return isNaN(num) ? 0 : num
    }

    const stats = useMemo(() => {
        const total = suppliers.length
        let totalOurDebt = 0    // computed_balance > 0 → biz ularga to'laymiz (bizda qarz bor) → label: "Qarz" (qizil)
        let totalTheyOweUs = 0  // computed_balance < 0 → ular bizga berishadi (ularda qarz bor bizda haq) → label: "Bizga qarz" (yashil)
        suppliers.forEach(s => {
            const bal = getSupplierBalance(s)
            if (bal > 0) totalOurDebt += bal
            if (bal < 0) totalTheyOweUs += Math.abs(bal)
        })
        return { total, totalDebt: totalOurDebt, totalCredit: totalTheyOweUs }
    }, [suppliers])

    const filteredSuppliers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return suppliers
        return suppliers.filter(s => {
            const haystack = [
                s.name, s.phone, s.contact_person, s.contactName,
                s.address, s.inn, s.stir, s.note
            ].filter(Boolean).join(' ').toLowerCase()
            return haystack.includes(q)
        })
    }, [suppliers, searchQuery])

    const handleSaveSupplier = async (formData) => {
        try {
            if (editingSupplier) {
                const updated = await suppliersApi.updateSupplier(editingSupplier.id, formData)
                const normalized = normalizeSupplier({ ...editingSupplier, ...updated, ...formData, id: editingSupplier.id })
                setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? normalized : s))
                toast.success("Postavchi muvaffaqiyatli tahrirlandi")
            } else {
                const tenantId = getActiveTenantId()
                const payload = {
                    ...formData,
                    ...(tenantId ? { tenant_id: tenantId } : {})
                }
                const created = await suppliersApi.createSupplier(payload)
                const normalized = normalizeSupplier({ ...payload, ...created })
                if (normalized && normalized.id) {
                    setSuppliers(prev => [normalized, ...(prev || [])])
                }
                toast.success("Yangi postavchi muvaffaqiyatli qo'shildi")
            }
            try { await loadSuppliers() } catch {}
        } catch (err) {
            console.error('Failed to save supplier:', err)
            throw err
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

    const handleDeleteSupplier = async (id) => {
        if (!window.confirm("Haqiqatan ham ushbu postavchini o'chirib tashlamoqchimisiz?")) return

        setDeletingId(id)
        try {
            await suppliersApi.deleteSupplier(id)
            toast.success("Postavchi o'chirildi")
            setSuppliers(prev => prev.filter(s => s.id !== id))
        } catch (err) {
            console.error('Failed to delete supplier:', err)
            throw err
        } finally {
            setDeletingId(null)
        }
    }

    if (loading && suppliers.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-700">
                <div className="px-4 h-[60px] flex items-center justify-between gap-3">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft size={22} className="text-gray-700 dark:text-gray-300" />
                    </button>
                    <h1 className="flex-1 text-[18px] font-extrabold text-gray-900 dark:text-white truncate">
                        Postavchiklar
                    </h1>
                    <button
                        onClick={() => {
                            setEditingSupplier(null)
                            setIsModalOpen(true)
                        }}
                        className="w-10 h-10 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-orange-500/20"
                    >
                        <UserPlus size={20} />
                    </button>
                </div>
            </div>

            <div className="p-4 flex-1 space-y-4">
                <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-6 rounded-[24px] text-white shadow-xl shadow-orange-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-400/20 rounded-full -ml-12 -mb-12 blur-2xl" />
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <h2 className="text-[20px] font-bold mb-1">Postavchiklar boshqaruvi</h2>
                                <p className="text-[13px] text-white/80">
                                    Hamkorlaringiz va ular bilan qarzdorlikni kuzating
                                </p>
                            </div>
                            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
                                <Package size={24} className="text-white" />
                            </div>
                        </div>
                        
                        <div className={`grid gap-3 ${
                            (stats.totalDebt > 0 && stats.totalCredit > 0) ? 'grid-cols-3'
                                : (stats.totalDebt > 0 || stats.totalCredit > 0) ? 'grid-cols-2'
                                    : 'grid-cols-1'
                        }`}>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
                                <p className="text-[11px] text-white/70 uppercase font-bold tracking-wider mb-1">Jami</p>
                                <p className="text-[24px] font-black leading-none">{stats.total}</p>
                            </div>
                            {stats.totalDebt > 0 && (
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
                                    <div className="flex items-center gap-1 mb-1">
                                        <TrendingUp size={10} className="text-red-200" />
                                        <p className="text-[10px] text-white/70 uppercase font-bold tracking-wider">Qarz</p>
                                    </div>
                                    <p className="text-[15px] font-black leading-none truncate text-red-50 dark:text-red-100">
                                        {formatCurrency(stats.totalDebt)}
                                    </p>
                                </div>
                            )}
                            {stats.totalCredit > 0 && (
                                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3">
                                    <div className="flex items-center gap-1 mb-1">
                                        <TrendingDown size={10} className="text-green-200" />
                                        <p className="text-[10px] text-white/70 uppercase font-bold tracking-wider">Bizga qarz</p>
                                    </div>
                                    <p className="text-[15px] font-black leading-none truncate text-green-50 dark:text-green-100">
                                        {formatCurrency(stats.totalCredit)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors z-10">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all text-[14px]"
                        placeholder="Nom, telefon, INN orqali qidirish..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {filteredSuppliers.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center pt-16 px-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-[32px] flex items-center justify-center mb-6 border-4 border-white dark:border-gray-700 shadow-sm">
                            <Building2 size={40} className="text-gray-400" />
                        </div>
                        <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-2">
                            {searchQuery ? "Hech narsa topilmadi" : "Hozircha postavchilar yo'q"}
                        </h3>
                        <p className="text-[14px] text-gray-500 dark:text-gray-400 max-w-[280px] mb-8 leading-relaxed">
                            {searchQuery
                                ? "Boshqa kalit so'z bilan qidirib ko'ring."
                                : "Siz hali birorta ham hamkor qo'shmagansiz. Yangi postavchi qo'shib biznesingizni kengaytiring."
                            }
                        </p>
                        {!searchQuery && (
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-bold text-[15px] shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                            >
                                Birinchi postavchini qo'shish
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredSuppliers.map((s, index) => {
                            const balance = getSupplierBalance(s)
                            const hasDebt = balance > 0
                            const hasCredit = balance < 0
                            const absBalance = Math.abs(balance)
                            const phone = pickSupplierField(s, ['phone', 'telefon', 'tel', 'mobile'])
                            const contactPerson = pickSupplierField(s, ['contact_person', 'contactName', 'contact_name', 'manager', 'fio'])
                            const address = pickSupplierField(s, ['address', 'manzil', 'location'])
                            const inn = pickSupplierField(s, ['inn', 'stir', 'tin'])
                            const note = pickSupplierField(s, ['note', 'comment', 'izoh', 'description'])

                            return (
                                <div 
                                    key={s.id} 
                                    className="bg-white dark:bg-gray-800 p-5 rounded-[24px] border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4"
                                    style={{ animationDelay: `${index * 40}ms` }}
                                >
                                    <div className="flex items-start gap-4 justify-between mb-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 bg-gradient-to-tr from-orange-100 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner shrink-0">
                                                <Building2 size={22} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight mb-2 truncate">{s.name}</p>
                                                
                                                <div className="flex flex-col gap-1.5">
                                                    {phone && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone size={12} className="text-gray-400 shrink-0" />
                                                            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">{phone}</p>
                                                        </div>
                                                    )}
                                                    {contactPerson && (
                                                        <div className="flex items-center gap-2">
                                                            <User size={12} className="text-gray-400 shrink-0" />
                                                            <p className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">{contactPerson}</p>
                                                        </div>
                                                    )}
                                                    {inn && (
                                                        <div className="flex items-center gap-2">
                                                            <Hash size={12} className="text-gray-400 shrink-0" />
                                                            <p className="text-[12px] text-gray-400 dark:text-gray-500 font-mono">INN: {inn}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={() => navigate(`/suppliers/${s.id}`)}
                                                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setEditingSupplier(s)
                                                    setIsModalOpen(true)
                                                }}
                                                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteSupplier(s.id)}
                                                disabled={deletingId === s.id}
                                                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                {deletingId === s.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {address && (
                                        <div className="flex items-start gap-2 mb-3 px-1">
                                            <MapPin size={12} className="text-gray-400 shrink-0 mt-0.5" />
                                            <p className="text-[12.5px] text-gray-500 dark:text-gray-400 leading-snug">{address}</p>
                                        </div>
                                    )}

                                    <div className={`rounded-2xl p-3 ${note ? 'bg-gray-50/50 dark:bg-gray-700/30' : (balance !== 0 ? (hasDebt ? 'bg-red-50/70 dark:bg-red-900/10' : hasCredit ? 'bg-emerald-50/70 dark:bg-emerald-900/10' : 'bg-gray-50/50 dark:bg-gray-700/30') : 'bg-gray-50/50 dark:bg-gray-700/30')}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                {hasDebt
                                                    ? <TrendingUp size={13} className="text-red-500" />
                                                    : hasCredit
                                                        ? <TrendingDown size={13} className="text-emerald-500" />
                                                        : <Package size={13} className="text-gray-400" />
                                                }
                                                <span className={`text-[11px] font-bold uppercase tracking-wider ${
                                                    hasDebt ? 'text-red-500' : hasCredit ? 'text-emerald-500' : 'text-gray-400'
                                                }`}>
                                                    {hasDebt ? "QARZ" : hasCredit ? "BIZGA QARZ" : "BALANS NOL"}
                                                </span>
                                            </div>
                                            <span className={`text-[15px] font-black ${
                                                hasDebt ? 'text-red-600 dark:text-red-400' : hasCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-300'
                                            }`}>
                                                {absBalance === 0 ? '0' : `${formatCurrency(absBalance)} so'm`}
                                            </span>
                                        </div>
                                        {note && (
                                            <div className={`flex items-start gap-2 pt-2 border-t border-gray-200/50 dark:border-gray-600/30`}>
                                                <FileText size={12} className="text-gray-400 shrink-0 mt-0.5" />
                                                <p className="text-[12.5px] text-gray-500 dark:text-gray-400 leading-snug">{note}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <SupplierModal 
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingSupplier(null)
                }}
                onSave={handleSaveSupplier}
                supplier={editingSupplier}
            />
        </div>
    )
}
