import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { paymentsApi } from '../api/payments.api'
import { debtsApi } from '../api/debts.api'
import { suppliersApi } from '../api/suppliers.api'
import {
    History, ArrowLeft, Search, Calendar,
    ArrowDownRight, ChevronRight, Receipt,
    TrendingDown, TrendingUp, Clock, Users, Package
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { CustomersSkeleton } from '../components/Skeleton'
import { formatCurrency } from '../utils/format'

export default function HistoryPage() {
    // scope: 'customers' (mijozlar) | 'suppliers' (yetkazuvchilar)
    const [scope, setScope] = useState('customers')
    const [mode, setMode] = useState('payments') // customers: 'payments'|'debts' ; suppliers: 'payments'|'purchases'
    const [payments, setPayments] = useState([])
    const [debts, setDebts] = useState([])
    const [suppliers, setSuppliers] = useState([])
    // all supplier movements: { supplier_id: { purchases: [], payments: [] } }
    const [supplierMovements, setSupplierMovements] = useState({})
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [displayLimit, setDisplayLimit] = useState(50)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            suppliersApi._resetDetection()
            const [paymentsData, debtsData, suppliersData] = await Promise.allSettled([
                paymentsApi.getPayments({ per_page: 500 }),
                debtsApi.getDebts({ per_page: 500 }),
                suppliersApi.getSuppliers()
            ])

            if (paymentsData.status === 'fulfilled') {
                const d = paymentsData.value
                setPayments(Array.isArray(d) ? d : (d.data || []))
            }
            if (debtsData.status === 'fulfilled') {
                const d = debtsData.value
                setDebts(Array.isArray(d) ? d : (d.data || []))
            }

            let supList = []
            if (suppliersData.status === 'fulfilled') {
                const d = suppliersData.value
                supList = Array.isArray(d) ? d : (d.data || [])
                setSuppliers(supList)
            }

            // Stage 1: Sync LS — instant populate supplierMovements (0 flash)
            try {
                const next = {}
                supList.forEach(s => {
                    const sid = String(s.id)
                    let pLs = []
                    let yLs = []
                    try {
                        const pRaw = localStorage.getItem(`supplier_${s.id}_purchases`)
                        const yRaw = localStorage.getItem(`supplier_${s.id}_payments`)
                        if (pRaw) pLs = JSON.parse(pRaw) || []
                        if (yRaw) yLs = JSON.parse(yRaw) || []
                    } catch { /* ignore */ }
                    next[sid] = {
                        supplier: s,
                        purchases: pLs,
                        payments: yLs
                    }
                })
                if (Object.keys(next).length > 0) setSupplierMovements(next)
            } catch { /* ignore */ }

            // Stage 2: async merged (remote + LS dedup) for each supplier in background
            if (supList.length > 0) {
                setTimeout(async () => {
                    try {
                        const merged = await Promise.allSettled(
                            supList.map(s => Promise.allSettled([
                                suppliersApi.getSupplierPurchasesMerged(s.id),
                                suppliersApi.getSupplierPaymentsMerged(s.id)
                            ]))
                        )
                        setSupplierMovements(prev => {
                            const next = { ...prev }
                            merged.forEach((r, i) => {
                                const s = supList[i]
                                const sid = String(s.id)
                                const cur = next[sid] || { supplier: s, purchases: [], payments: [] }
                                if (r.status === 'fulfilled') {
                                    const [pur, pay] = r.value
                                    if (pur.status === 'fulfilled') {
                                        const list = Array.isArray(pur.value) ? pur.value : (pur.value?.data || [])
                                        if (list.length > 0) cur.purchases = list
                                    }
                                    if (pay.status === 'fulfilled') {
                                        const list = Array.isArray(pay.value) ? pay.value : (pay.value?.data || [])
                                        if (list.length > 0) cur.payments = list
                                    }
                                }
                                cur.supplier = s
                                next[sid] = cur
                            })
                            return next
                        })
                    } catch { /* ignore */ }
                }, 0)
            }
        } catch (err) {
            console.error('Failed to load history data:', err)
        } finally {
            setLoading(false)
        }
    }

    // Header mode title helpers
    const scopeLabel = scope === 'customers' ? 'Mijozlar' : 'Yetkazuvchilar'
    const modeTitle = scope === 'customers'
        ? (mode === 'payments' ? "To'lovlar tarixi" : "Nasiyalar tarixi")
        : (mode === 'payments' ? "To'lovlar tarixi (yetkazuvchilarga)" : "Xaridlar tarixi (yetkazuvchilardan)")
    const modeSubtitle = scope === 'customers'
        ? (mode === 'payments' ? "Barcha qabul qilingan to'lovlar" : "Barcha berilgan nasiyalar")
        : (mode === 'payments' ? "Yetkazuvchilarga berilgan barcha to'lovlar" : "Yetkazuvchilardan qilingan barcha xaridlar")

    // Switching scope → reset display limit & set default mode accordingly
    const switchScope = (nextScope) => {
        if (nextScope === scope) return
        setScope(nextScope)
        setMode('payments')
        setDisplayLimit(50)
    }
    const switchMode = (nextMode) => {
        setMode(nextMode)
        setDisplayLimit(50)
    }

    // Supplier flattened rows (each movement with supplier info)
    const supplierAllPurchases = useMemo(() => {
        const out = []
        Object.values(supplierMovements).forEach(b => {
            const s = b.supplier
            ;(b.purchases || []).forEach(p => {
                out.push({
                    id: `p-${s.id}-${p.id ?? p.created_at ?? Math.random()}`,
                    _raw: p,
                    supplier: s,
                    name: s?.name || s?.company_name || 'Yetkazuvchi',
                    phone: s?.phone || '',
                    amount: parseFloat(p?.amount || p?.total_amount || 0),
                    reference: p?.reference || p?.invoice || p?.description || '',
                    dateStr: p?.created_at || p?.date || p?.purchase_date || '',
                    type: 'purchase',
                    scope: 'supplier'
                })
            })
        })
        return out
    }, [supplierMovements])

    const supplierAllPayments = useMemo(() => {
        const out = []
        Object.values(supplierMovements).forEach(b => {
            const s = b.supplier
            ;(b.payments || []).forEach(p => {
                out.push({
                    id: `y-${s.id}-${p.id ?? p.created_at ?? Math.random()}`,
                    _raw: p,
                    supplier: s,
                    name: s?.name || s?.company_name || 'Yetkazuvchi',
                    phone: s?.phone || '',
                    amount: parseFloat(p?.amount || 0),
                    reference: p?.description || p?.note || p?.reference || '',
                    dateStr: p?.created_at || p?.paid_at || p?.payment_date || '',
                    type: 'payment',
                    scope: 'supplier',
                    method: p?.payment_method || ''
                })
            })
        })
        return out
    }, [supplierMovements])

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)

        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        const yyyy = date.getFullYear()

        const hh = String(date.getHours()).padStart(2, '0')
        const min = String(date.getMinutes()).padStart(2, '0')

        return `${mm}/${dd}/${yyyy} ${hh}:${min}`
    }

    // activeItems based on scope + mode
    const { activeItems, amountColor, accentBg, accentIcon, accentIconColor, emptyText, itemBadgeColor, itemBadgeBg } = useMemo(() => {
        if (scope === 'customers') {
            if (mode === 'payments') {
                return {
                    activeItems: payments,
                    amountColor: 'text-green-500',
                    accentBg: 'bg-green-500',
                    accentIcon: TrendingDown,
                    accentIconColor: 'text-green-500',
                    emptyText: "Mijozlardan to'lovlar hali mavjud emas",
                    itemBadgeColor: 'text-green-600 dark:text-green-400',
                    itemBadgeBg: 'bg-green-500/20'
                }
            }
            return {
                activeItems: debts,
                amountColor: 'text-red-500',
                accentBg: 'bg-red-500',
                accentIcon: TrendingUp,
                accentIconColor: 'text-red-500',
                emptyText: "Mijozlarga berilgan nasiyalar hali mavjud emas",
                itemBadgeColor: 'text-red-600 dark:text-red-400',
                itemBadgeBg: 'bg-red-500/20'
            }
        }
        // Suppliers
        if (mode === 'payments') {
            return {
                activeItems: supplierAllPayments,
                amountColor: 'text-amber-600 dark:text-amber-400',
                accentBg: 'bg-amber-500',
                accentIcon: TrendingDown,
                accentIconColor: 'text-amber-600 dark:text-amber-400',
                emptyText: "Yetkazuvchilarga to'lovlar hali mavjud emas",
                itemBadgeColor: 'text-amber-600 dark:text-amber-400',
                itemBadgeBg: 'bg-amber-500/20'
            }
        }
        return {
            activeItems: supplierAllPurchases,
            amountColor: 'text-blue-500',
            accentBg: 'bg-blue-500',
            accentIcon: TrendingUp,
            accentIconColor: 'text-blue-500',
            emptyText: "Yetkazuvchilardan xaridlar hali mavjud emas",
            itemBadgeColor: 'text-blue-600 dark:text-blue-400',
            itemBadgeBg: 'bg-blue-500/20'
        }
    }, [scope, mode, payments, debts, supplierAllPurchases, supplierAllPayments])

    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase()
        if (!query) return activeItems
        return activeItems.filter(item => {
            // Name field (customer.name or supplier.name)
            const customerName = (item.customer?.name || item.debt?.customer?.name || '').toLowerCase()
            const supplierName = (item.name || item.supplier?.name || item.supplier?.company_name || '').toLowerCase()
            const phone = (item.customer?.phone || item.debt?.customer?.phone || item.phone || item.supplier?.phone || '').toLowerCase()
            const amount = (item.amount || item.total_amount || '').toString()
            const note = (item.note || item.description || item.reference || '').toLowerCase()
            return customerName.includes(query) || supplierName.includes(query) ||
                phone.includes(query) || amount.includes(query) || note.includes(query)
        })
    }, [activeItems, searchQuery])

    // Sort & display
    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            const dateA = new Date(a.paid_at || a.created_at || a.dateStr || 0)
            const dateB = new Date(b.paid_at || b.created_at || b.dateStr || 0)
            return dateB - dateA
        })
    }, [filteredItems])

    const displayedItems = sortedItems.slice(0, displayLimit)

    const groupedItems = displayedItems.reduce((groups, item) => {
        const dateObj = new Date(item.paid_at || item.created_at || item.dateStr || 0)
        if (isNaN(dateObj.getTime())) return groups
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
        const dd = String(dateObj.getDate()).padStart(2, '0')
        const yyyy = dateObj.getFullYear()
        const date = `${mm}/${dd}/${yyyy}`
        if (!groups[date]) groups[date] = []
        groups[date].push(item)
        return groups
    }, {})

    if (loading) {
        return <CustomersSkeleton />
    }

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors overflow-x-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link to="/" className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
                </Link>
                <div>
                    <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">
                        {modeTitle}
                    </h1>
                    <p className="text-gray-400 text-[13px]">
                        {modeSubtitle}
                    </p>
                </div>
            </div>

            {/* Scope segment: MIJOZLAR / YETKAZUVCHILAR */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-4">
                <button
                    onClick={() => switchScope('customers')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold transition-all ${scope === 'customers'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <Users size={16} />
                    Mijozlar
                </button>
                <button
                    onClick={() => switchScope('suppliers')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold transition-all ${scope === 'suppliers'
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <Package size={16} />
                    Yetkazuvchilar
                </button>
            </div>

            {/* Mode segment: To'lovlar vs Nasiyalar/Xaridlar */}
            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6">
                <button
                    onClick={() => switchMode('payments')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold transition-all ${mode === 'payments'
                        ? `${scope === 'customers' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'}`
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <TrendingDown size={16} />
                    {scope === 'customers' ? "To'lovlar" : "To'lovlar"}
                </button>
                <button
                    onClick={() => switchMode(scope === 'customers' ? 'debts' : 'purchases')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold transition-all ${mode !== 'payments'
                        ? `${scope === 'customers' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'}`
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <TrendingUp size={16} />
                    {scope === 'customers' ? 'Nasiyalar' : 'Xaridlar'}
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder={`${scopeLabel} bo'yicha qidiruv (ism, summa, telefon...)`}
                    className="input pl-12"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Content List */}
            <div className="space-y-6">
                {sortedItems.length === 0 ? (
                    <div className="card text-center py-12 text-gray-400">
                        <Receipt size={48} className="mx-auto mb-3 opacity-20" />
                        <p>{emptyText}</p>
                    </div>
                ) : (
                    Object.entries(groupedItems).map(([date, items]) => (
                        <div key={date}>
                            <h2 className="section-title mb-3 flex items-center gap-2">
                                <Calendar size={14} />
                                {date}
                            </h2>
                            <div className="space-y-2">
                                {items.map((item) => {
                                    const Icon = accentIcon
                                    const itemName = scope === 'customers'
                                        ? (item.customer?.name || item.debt?.customer?.name || 'Mijoz')
                                        : (item.name || item.supplier?.name || 'Yetkazuvchi')
                                    const itemPhone = scope === 'customers'
                                        ? (item.customer?.phone || item.debt?.customer?.phone)
                                        : (item.phone || item.supplier?.phone)
                                    const itemAmount = item.amount || item.total_amount || 0
                                    const itemBadgeLabel = scope === 'customers'
                                        ? (mode === 'payments' ? "To'lov" : "Nasiya")
                                        : (mode === 'payments' ? "To'lov" : 'Xarid')
                                    const itemDate = item.paid_at || item.created_at || item.dateStr || ''
                                    return (
                                        <div key={item.id} className="card relative overflow-hidden active:scale-[0.99] transition-transform">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                    scope === 'customers'
                                                        ? mode === 'payments'
                                                            ? 'bg-green-100 dark:bg-green-900/30'
                                                            : 'bg-red-100 dark:bg-red-900/30'
                                                        : mode === 'payments'
                                                            ? 'bg-amber-100 dark:bg-amber-900/30'
                                                            : 'bg-blue-100 dark:bg-blue-900/30'
                                                }`}>
                                                    <Icon size={20} className={accentIconColor} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <h3 className="text-[15px] font-bold text-gray-900 dark:text-white truncate">
                                                            {itemName}
                                                            <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${itemBadgeBg} ${itemBadgeColor}`}>
                                                                {itemBadgeLabel}
                                                            </span>
                                                        </h3>
                                                        <span className={`text-[15px] font-bold whitespace-nowrap ${amountColor}`}>
                                                            {formatCurrency(itemAmount)} <small className="text-[10px]">so'm</small>
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                                                        <div className="flex items-center gap-1">
                                                            <Clock size={12} />
                                                            {formatDate(itemDate)}
                                                        </div>
                                                        {itemPhone && (
                                                            <span>{itemPhone}</span>
                                                        )}
                                                    </div>
                                                    {item.reference && (
                                                        <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                            {item.reference}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`absolute bottom-0 left-0 h-1 rounded-full ${
                                                scope === 'customers'
                                                    ? (mode === 'payments' ? 'bg-green-500/20' : 'bg-red-500/20')
                                                    : (mode === 'payments' ? 'bg-amber-500/20' : 'bg-blue-500/20')
                                            }`} style={{ width: '100%' }} />
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Load More Button */}
            {sortedItems.length > displayLimit && (
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={() => setDisplayLimit(prev => prev + 50)}
                        className="btn btn-secondary w-full max-w-xs"
                    >
                        Yana 50 tasini ko'rish
                    </button>
                </div>
            )}

            <div className="h-24" />
        </div>
    )
}
