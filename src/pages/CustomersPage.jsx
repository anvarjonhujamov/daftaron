import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Drawer } from 'vaul'
import { customersApi } from '../api/customers.api'
import { debtsApi } from '../api/debts.api'
import { Search, Plus, ChevronRight, Users, User, Phone, X, Loader2, Clock, MessageSquare } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import { CustomersSkeleton } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import toast from 'react-hot-toast'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'
import { formatCurrency } from '../utils/format'

export default function CustomersPage() {
    const location = useLocation()
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('')
    const [showAddDrawer, setShowAddDrawer] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState({ name: '', phone: PHONE_PREFIX })

    // Overdue tab state
    const [overdueList, setOverdueList] = useState([])
    const [overdueLoading, setOverdueLoading] = useState(false)
    const [overdueDays, setOverdueDays] = useState(10)

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const filterParam = params.get('filter')
        if (filterParam) setFilter(filterParam)
        if (location.state?.openAddDrawer) {
            setShowAddDrawer(true)
            window.history.replaceState({}, document.title)
        }
    }, [location.search])

    // Load overdue when tab switches to 'overdue'
    useEffect(() => {
        if (filter === 'overdue') loadOverdue()
    }, [filter, overdueDays])

    const loadOverdue = async () => {
        setOverdueLoading(true)
        try {
            const data = await debtsApi.getOverdue({ days: overdueDays, order: 'desc' })
            setOverdueList(Array.isArray(data) ? data : (data.data || []))
        } catch (err) {
            console.error('Failed to load overdue:', err)
        } finally {
            setOverdueLoading(false)
        }
    }

    useEffect(() => {
        const query = search.trim()
        const delay = query ? 400 : 0
        const t = setTimeout(() => loadCustomers(query), delay)
        return () => clearTimeout(t)
    }, [search])

    const loadCustomers = async (searchQuery = '') => {
        setLoading(true)
        try {
            const params = searchQuery.trim() ? { q: searchQuery.trim() } : {}
            const data = await customersApi.getCustomers(params)
            setCustomers(Array.isArray(data) ? data : (data.data || []))
        } catch (err) {
            console.error('Failed to load customers:', err)
        } finally {
            setLoading(false)
        }
    }

    const filteredCustomers = useMemo(() => {
        let result = [...customers]

        if (filter === 'debtors') {
            result = result.filter(c => {
                const debt = parseFloat(c.remaining_amount ?? c.remaining_debts ?? c.debt_sum ?? c.balance ?? c.total_debt ?? 0)
                return debt > 0
            })
        } else if (filter === 'paid') {
            result = result.filter(c => {
                const debt = parseFloat(c.remaining_amount ?? c.remaining_debts ?? c.debt_sum ?? c.balance ?? c.total_debt ?? 0)
                return debt <= 0
            })
        }

        if (search.trim()) {
            const query = search.toLowerCase().trim()
            result = result.filter(c => {
                const nameMatch = c.name?.toLowerCase().includes(query)
                const phone = c.phone?.replace(/\D/g, '') || ''
                const last4 = phone.slice(-4)
                const phoneMatch = last4.includes(query) || phone.includes(query)
                return nameMatch || phoneMatch
            })
        }

        return result
    }, [customers, filter, search])

    const handleAddCustomer = async (e) => {
        e.preventDefault()
        if (!form.name.trim()) return

        setSubmitting(true)
        try {
            const rawPhone = getRawPhoneNumber(form.phone)
            await customersApi.createCustomer({
                name: form.name.trim(),
                phone: rawPhone !== '+998' ? rawPhone : null
            })
            setForm({ name: '', phone: PHONE_PREFIX })
            setShowAddDrawer(false)
            toast.success('Mijoz qo\'shildi')
            loadCustomers()
        } catch (err) {
            toast.error(err.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSubmitting(false)
        }
    }

    const highlightText = (text, query) => {
        if (!query.trim() || !text) return text
        const lowerText = text.toLowerCase()
        const lowerQuery = query.toLowerCase().trim()
        const index = lowerText.indexOf(lowerQuery)
        if (index === -1) return text
        return (
            <>
                {text.slice(0, index)}
                <span className="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded px-0.5">
                    {text.slice(index, index + lowerQuery.length)}
                </span>
                {text.slice(index + lowerQuery.length)}
            </>
        )
    }

    const highlightPhone = (phone, query) => {
        if (!query.trim() || !phone) return phone
        const cleanPhone = phone.replace(/\D/g, '')
        const last4 = cleanPhone.slice(-4)
        const lowerQuery = query.trim()
        if (last4.includes(lowerQuery)) {
            const displayPhone = phone
            const index = displayPhone.lastIndexOf(lowerQuery)
            if (index !== -1) {
                return (
                    <>
                        {displayPhone.slice(0, index)}
                        <span className="bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded px-0.5">
                            {displayPhone.slice(index, index + lowerQuery.length)}
                        </span>
                        {displayPhone.slice(index + lowerQuery.length)}
                    </>
                )
            }
        }
        return phone
    }

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-[28px] font-bold text-gray-900 dark:text-white">Mijozlar</h1>
                <button
                    onClick={() => setShowAddDrawer(true)}
                    className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
                >
                    <Plus size={22} strokeWidth={2.5} />
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    className="input pl-11"
                    placeholder="Mijoz qidirish..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Filter Pills */}
            <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
                {[
                    { value: '', label: 'Barchasi' },
                    { value: 'debtors', label: 'Qarzdor' },
                    { value: 'paid', label: "To'langan" },
                    { value: 'overdue', label: "Muddati o'tganlar" }
                ].map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={`px-3 py-2 rounded-full text-[12px] font-medium transition-all ${filter === tab.value ? 'bg-blue-500 text-white' : 'bg-white text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overdue Tab Content */}
            {filter === 'overdue' ? (
                <>
                    {/* Days filter */}
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-[13px] text-gray-500 dark:text-gray-400">Kundan:</span>
                        <select
                            value={overdueDays}
                            onChange={(e) => setOverdueDays(Number(e.target.value))}
                            className="input !w-auto !py-1.5 !px-3 text-[13px]"
                        >
                            {[5, 7, 10, 15, 20, 30].map(d => (
                                <option key={d} value={d}>{d} kun</option>
                            ))}
                        </select>
                    </div>

                    {overdueLoading ? (
                        <CustomersSkeleton />
                    ) : overdueList.length === 0 ? (
                        <EmptyState
                            icon={Clock}
                            title="Muddati o'tgan qarzlar yo'q"
                            description={`${overdueDays} kundan oshgan ochiq nasiyalar topilmadi`}
                        />
                    ) : (
                        <div className="space-y-2">
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-2">
                                {overdueList.length} ta qarzdor
                            </p>
                            {overdueList.map((item, idx) => (
                                <div
                                    key={item.customer_id || idx}
                                    className="card dark:bg-gray-800 active:scale-[0.98] transition-transform"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="avatar avatar-sm bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                                            {item.customer_name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">
                                                {item.customer_name}
                                            </h3>
                                            <p className="text-[12px] text-gray-400">{item.customer_phone || 'Telefon yo\'q'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[14px] font-bold text-red-500">
                                                {formatCurrency(item.total_remaining || item.remaining_amount || 0)}
                                            </p>
                                            <p className="text-[11px] text-orange-500 font-medium">
                                                {item.days_overdue || item.overdue_days || '?'} kun
                                            </p>
                                        </div>
                                    </div>
                                    {item.customer_phone && (
                                        <a
                                            href={`sms:${item.customer_phone}`}
                                            className="flex items-center justify-center gap-2 mt-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 text-[13px] font-medium"
                                        >
                                            <MessageSquare size={14} />
                                            SMS yuborish
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <>
                    {/* Count */}
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-3">
                        {filteredCustomers.length} ta mijoz
                    </p>

                    {/* Customer List */}
                    {loading ? (
                        <CustomersSkeleton />
                    ) : filteredCustomers.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title={
                                search ? "Topilmadi" :
                                    filter === 'paid' ? "To'langan mijozlar yo'q" :
                                        filter === 'debtors' ? "Qarzdor mijozlar yo'q" :
                                            "Mijozlar yo'q"
                            }
                            description={
                                search ? `"${search}" bo'yicha natija yo'q` :
                                    filter === 'paid' ? "Hali to'langan mijozlar mavjud emas" :
                                        filter === 'debtors' ? "Hozirda barcha qarzdorlar to'lov qildi" :
                                            "Hali mijoz qo'shilmagan"
                            }
                            action={!search && !filter && (
                                <button onClick={() => setShowAddDrawer(true)} className="btn btn-primary mt-4">
                                    <Plus size={18} />
                                    Yangi mijoz qo'shish
                                </button>
                            )}
                        />
                    ) : (
                        <div className="space-y-3">
                            {filteredCustomers.map((customer) => (
                                <Link
                                    key={customer.id}
                                    to={`/customers/${customer.id}`}
                                    className="card flex items-center gap-3 active:scale-[0.98] transition-transform"
                                >
                                    <div className="avatar avatar-md">
                                        {customer.name?.charAt(0)?.toLowerCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
                                            {search ? highlightText(customer.name, search) : customer.name}
                                        </h3>
                                        <p className="text-[13px] text-gray-400">
                                            {search && /^\d+$/.test(search.trim())
                                                ? highlightPhone(customer.phone || 'telefon yo\'q', search)
                                                : customer.phone || 'telefon yo\'q'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {(() => {
                                            const currentDebt = parseFloat(
                                                customer.remaining_amount ??
                                                customer.remaining_debts ??
                                                customer.debt_sum ??
                                                customer.balance ??
                                                customer.total_debt ?? 0
                                            );
                                            return (
                                                <>
                                                    <div className={`text-[15px] font-bold ${currentDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                        {formatCurrency(currentDebt)} so'm
                                                    </div>
                                                    <span className={`badge text-[11px] ${currentDebt > 0 ? 'badge-debtor' : 'badge-paid'}`}>
                                                        {currentDebt > 0 ? 'Qarzdor' : "To'langan"}
                                                    </span>
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300 dark:text-gray-600" />
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Add Customer Drawer */}
            <Drawer.Root open={showAddDrawer} onOpenChange={setShowAddDrawer} repositionInputs={false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50">
                        <div className="p-4 pb-8">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                        Mijoz qo'shish
                                    </Drawer.Title>
                                    <Drawer.Description className="text-gray-400 text-[14px]">
                                        Yangi mijoz ma'lumotlarini kiriting
                                    </Drawer.Description>
                                </div>
                                <button onClick={() => setShowAddDrawer(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>
                            <form onSubmit={handleAddCustomer} className="space-y-4">
                                <div>
                                    <label className="label">Mijoz ismi</label>
                                    <div className="relative">
                                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" className="input pl-11" placeholder="Ism kiriting..." value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Telefon raqami (ixtiyoriy)</label>
                                    <div className="relative">
                                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input type="text" className="input pl-11" placeholder="+998 XX XXX XX XX" value={form.phone} onChange={(e) => setForm({ ...form, phone: formatPhoneNumber(e.target.value) })} />
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary w-full" disabled={submitting || !form.name.trim()}>
                                    {submitting ? <Loader2 size={20} className="animate-spin" /> : 'Mijoz qo\'shish'}
                                </button>
                            </form>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        </div>
    )
}
