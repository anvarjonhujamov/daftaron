import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { debtsApi } from '../api/debts.api'
import { paymentsApi } from '../api/payments.api'
import { staffApi } from '../api/staff.api'
import {
    Calendar, ArrowUpRight, ArrowDownRight,
    ChevronRight, History, Receipt, Clock, X, ChevronLeft
} from 'lucide-react'
import { Drawer } from 'vaul'
import LoadingSpinner from '../components/LoadingSpinner'
import { CustomersSkeleton } from '../components/Skeleton'
import { formatCurrency } from '../utils/format'
import { isUserStaff } from '../utils/roleHelper'

const MONTH_NAMES = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
]

export default function DebtsPage() {
    const [allDebts, setAllDebts] = useState([])
    const [allPayments, setAllPayments] = useState([])
    const [staffMembers, setStaffMembers] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isStaff, setIsStaff] = useState(false)
    const today = new Date()
    const [selectedDate, setSelectedDate] = useState(() => `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
    const [selectedStaffId, setSelectedStaffId] = useState('all')
    const [periodType, setPeriodType] = useState('monthly')
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [pickerYear, setPickerYear] = useState(today.getFullYear())
    const currentYear = today.getFullYear()
    const currentMonthIndex = today.getMonth()

    useEffect(() => {
        loadData()
        loadStaff()
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser)
                if (parsed?.id || parsed?.user_id) {
                    setCurrentUser(parsed)
                }
            } catch (err) {
                console.error('Failed to parse user from localStorage', err)
            }
        }

        const checkStaff = async () => {
            try {
                const staffUser = await isUserStaff(staffApi)
                setIsStaff(staffUser)

                if (staffUser) {
                    const stored = localStorage.getItem('user')
                    const u = stored ? JSON.parse(stored) : null
                    const myId = u?.id || u?.user_id
                    if (u && myId) {
                        setCurrentUser(u)
                    }

                    // Resolve staff record id for reliable filtering (some APIs use staff_id instead of user_id)
                    try {
                        const staffListResp = await staffApi.getStaff()
                        const staffList = Array.isArray(staffListResp) ? staffListResp : (staffListResp.data || [])
                        const staffRec = staffList.find(s => String(s.id) === String(myId) || String(s.user_id) === String(myId))
                        const effectiveId = staffRec?.id ?? myId
                        setSelectedStaffId(String(effectiveId))
                    } catch {
                        if (myId) setSelectedStaffId(String(myId))
                    }
                }
            } catch (err) {
                console.error('Failed to check staff status:', err)
            }
        }

        checkStaff()
    }, [])

    const getUserRelationIds = (item) => {
        const fields = [
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
            fields.push(
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

        return fields
    }

    const loadData = async () => {
        try {
            setLoading(true)
            const [debtsData, paymentsData] = await Promise.all([
                debtsApi.getDebts({ per_page: 500 }),
                paymentsApi.getPayments({ per_page: 500 })
            ])
            setAllDebts(Array.isArray(debtsData) ? debtsData : (debtsData.data || []))
            setAllPayments(Array.isArray(paymentsData) ? paymentsData : (paymentsData.data || []))
        } catch (err) {
            console.error('Failed to load data:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadStaff = async () => {
        try {
            const response = await staffApi.getStaff()
            setStaffMembers(Array.isArray(response) ? response : (response.data || []))
        } catch (err) {
            console.error('Failed to load staff:', err)
            setStaffMembers([])
        }
    }

    const parseDate = (value) => {
        const date = new Date(value || '')
        return Number.isNaN(date.getTime()) ? null : date
    }

    const getWeekRange = (referenceDate) => {
        const date = new Date(referenceDate)
        const day = date.getDay()
        const delta = day === 0 ? 6 : day - 1
        const start = new Date(date)
        start.setDate(date.getDate() - delta)
        start.setHours(0, 0, 0, 0, 0)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        return { start, end }
    }

    const getReportRange = () => {
        const now = new Date()
        if (periodType === 'daily') {
            const [year, month, day] = selectedDate.split('-').map(Number)
            const start = new Date(year, month - 1, day, 0, 0, 0, 0)
            const end = new Date(year, month - 1, day, 23, 59, 59, 999)
            return { start, end }
        }
        if (periodType === 'yearly') {
            const year = Number(selectedDate) || now.getFullYear()
            const start = new Date(year, 0, 1, 0, 0, 0, 0)
            const end = new Date(year, 11, 31, 23, 59, 59, 999)
            return { start, end }
        }
        if (periodType === 'monthly') {
            const [year, month] = selectedDate.split('-').map(Number)
            const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
            const end = new Date(year, month, 0, 23, 59, 59, 999)
            return { start, end }
        }
        if (periodType === 'last_week') {
            const thisWeek = getWeekRange(now)
            const start = new Date(thisWeek.start)
            start.setDate(start.getDate() - 7)
            const end = new Date(start)
            end.setDate(start.getDate() + 6)
            end.setHours(23, 59, 59, 999)
            return { start, end }
        }
        return getWeekRange(now)
    }

    const getStaffMatch = (item, staffId) => {
        if (staffId === 'all') return true

        const ownerId = currentUser?.id || currentUser?.user_id
        const fields = getUserRelationIds(item)

        if (staffId === 'owner') {
            if (!ownerId) return true
            return fields.some((value) => Number(value) === Number(ownerId))
        }

        const id = Number(staffId)
        return fields.some((value) => Number(value) === id)
    }

    const getStaffName = (staffId) => {
        if (staffId === 'all') return null
        return staffMembers.find((staff) => String(staff.id) === String(staffId))?.name || null
    }

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

    const normalizeTwoDigits = (value) => String(value).padStart(2, '0')

    const resetSelectedDateForType = (type) => {
        const now = new Date()
        if (type === 'yearly') {
            const year = now.getFullYear()
            setSelectedDate(String(year))
            setPickerYear(year)
            return
        }
        if (type === 'daily') {
            setSelectedDate(`${now.getFullYear()}-${normalizeTwoDigits(now.getMonth() + 1)}-${normalizeTwoDigits(now.getDate())}`)
            setPickerYear(now.getFullYear())
            return
        }
        setSelectedDate(`${now.getFullYear()}-${normalizeTwoDigits(now.getMonth() + 1)}`)
        setPickerYear(now.getFullYear())
    }

    const handlePeriodTypeSelect = (type) => {
        setPeriodType(type)
        setShowDatePicker(false)
        resetSelectedDateForType(type)
    }

    const reportRange = useMemo(() => getReportRange(), [periodType, selectedDate])

    const filteredDebts = useMemo(() => {
        return allDebts.filter((d) => {
            const date = parseDate(d.debt_date || d.created_at)
            if (!date) return false
            const inRange = reportRange.start <= date && date <= reportRange.end
            return inRange && getStaffMatch(d, selectedStaffId)
        })
    }, [allDebts, reportRange, selectedStaffId])

    const filteredPayments = useMemo(() => {
        return allPayments.filter((p) => {
            const date = parseDate(p.paid_at || p.created_at)
            if (!date) return false
            const inRange = reportRange.start <= date && date <= reportRange.end
            return inRange && getStaffMatch(p, selectedStaffId)
        })
    }, [allPayments, reportRange, selectedStaffId])

    const reportStats = useMemo(() => ({
        debts: filteredDebts.reduce((sum, d) => sum + (parseFloat(d.total_amount) || 0), 0),
        debtCount: filteredDebts.length,
        payments: filteredPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    }), [filteredDebts, filteredPayments])

    const combinedActivity = useMemo(() => {
        const debts = filteredDebts.map(d => ({ ...d, type: 'debt', date: parseDate(d.debt_date || d.created_at) || new Date() }))
        const payments = filteredPayments.map(p => ({ ...p, type: 'payment', date: parseDate(p.paid_at || p.created_at) || new Date() }))

        return [...debts, ...payments]
            .sort((a, b) => b.date - a.date)
            .slice(0, 5)
    }, [filteredDebts, filteredPayments])

    const displayPeriod = useMemo(() => {
        if (periodType === 'daily') return selectedDate
        if (periodType === 'weekly') return 'Bu hafta'
        if (periodType === 'last_week') return "O'tgan hafta"
        if (periodType === 'yearly') return `${selectedDate} yil`
        const [year, month] = selectedDate.split('-')
        return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`
    }, [periodType, selectedDate])

    const staffOptions = useMemo(() => {
        const ownerOption = currentUser ? [{
            id: 'owner',
            label: `Do'kon egasi (${currentUser.phone || ''})`,
            value: 'owner'
        }] : []

        const otherStaff = staffMembers
            .filter((staff) => String(staff.id) !== String(currentUser?.id))
            .map((staff) => ({
                id: staff.id,
                label: `${staff.name}${staff.phone ? ` (${staff.phone})` : ''}`,
                value: staff.id
            }))

        return [...ownerOption, ...otherStaff]
    }, [currentUser, staffMembers])

    const handleSelectMonth = (monthIndex) => {
        const newDate = `${pickerYear}-${String(monthIndex + 1).padStart(2, '0')}`
        setSelectedDate(newDate)
        setShowDatePicker(false)
    }

    if (loading) {
        return <CustomersSkeleton />
    }

    return (
        <div className="px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors overflow-x-hidden">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-[28px] font-bold text-gray-900 dark:text-white">Hisobotlar</h1>
                <p className="text-gray-400 text-[14px]">Biznes tahlili va ko'rsatkichlar</p>
            </div>

            <div className="mb-4 space-y-2">
                {!isStaff && (
                    <div className="card p-3 h-full">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1.5">Xodim bo'yicha</p>
                        <div className="relative">
                            <select
                                value={selectedStaffId}
                                onChange={(event) => setSelectedStaffId(event.target.value)}
                                className="w-full appearance-none rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Hammasi</option>
                                {staffOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <svg className="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                <div className="card p-3 h-full">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider whitespace-nowrap">Hisobot turi</p>
                                <p className="text-[16px] font-bold text-gray-900 dark:text-white truncate">{displayPeriod}</p>
                            </div>
                        </div>
                        <div className="flex gap-1.5 items-center flex-wrap">
                            {[
                                { value: 'yearly', label: 'Yillik' },
                                { value: 'monthly', label: 'Oylik' },
                                { value: 'weekly', label: 'Bu hafta' },
                                { value: 'last_week', label: "O'tgan hafta" },
                                { value: 'daily', label: 'Kunlik' }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handlePeriodTypeSelect(option.value)}
                                    className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition shrink-0 ${periodType === option.value ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 items-stretch">
                    {periodType === 'yearly' && (
                        <div className="card p-3 h-full sm:col-span-2 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Yil</p>
                                <p className="text-[17px] font-bold text-gray-900 dark:text-white truncate">{selectedDate} yil</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => {
                                        const year = Number(selectedDate) - 1
                                        setSelectedDate(String(year))
                                        setPickerYear(year)
                                    }}
                                    className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 flex items-center justify-center"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <button
                                    onClick={() => {
                                        const year = Number(selectedDate) + 1
                                        setSelectedDate(String(year))
                                        setPickerYear(year)
                                    }}
                                    disabled={Number(selectedDate) >= currentYear}
                                    className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 flex items-center justify-center"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {periodType === 'daily' && (
                        <div className="card p-3 h-full sm:col-span-2 overflow-hidden">
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">Kun</p>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(event) => setSelectedDate(event.target.value)}
                                className="input w-full max-w-full box-border"
                            />
                        </div>
                    )}

                    {periodType === 'monthly' && (
                        <button
                            onClick={() => {
                                setPickerYear(parseInt(selectedDate.split('-')[0], 10))
                                setShowDatePicker(true)
                            }}
                            className="card h-full sm:col-span-2 w-full flex items-center justify-between p-3 active:scale-[0.98] transition-all text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-500">
                                    <Calendar size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-400 uppercase font-bold tracking-wider">Oy tanlandi</p>
                                    <p className="text-[17px] font-bold text-gray-900 dark:text-white">{displayPeriod}</p>
                                </div>
                            </div>
                            <div className="p-2 text-gray-300">
                                <Calendar size={18} />
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* Drawer for Month Picker */}
            <Drawer.Root open={showDatePicker} onOpenChange={setShowDatePicker}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
                    <Drawer.Content className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl z-50 max-h-[85vh] outline-none">
                        <div className="p-4 pb-8">
                            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-6" />

                            <div className="flex items-center justify-between mb-8 px-2">
                                <Drawer.Title className="text-[20px] font-bold text-gray-900 dark:text-white">
                                    Davrni tanlang
                                </Drawer.Title>
                                <button
                                    onClick={() => setShowDatePicker(false)}
                                    className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Year Selector */}
                            <div className="flex items-center justify-center gap-8 mb-8">
                                <button
                                    onClick={() => setPickerYear(prev => prev - 1)}
                                    className="p-2 text-gray-400 hover:text-blue-500"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <span className="text-[24px] font-black text-gray-900 dark:text-white tracking-tight">
                                    {pickerYear}
                                </span>
                                <button
                                    onClick={() => {
                                        if (pickerYear < currentYear) {
                                            setPickerYear(prev => prev + 1)
                                        }
                                    }}
                                    disabled={pickerYear >= currentYear}
                                    className="p-2 text-gray-400 hover:text-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={24} />
                                </button>
                            </div>

                            {/* Months Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {MONTH_NAMES.map((name, index) => {
                                    const isSelected = selectedDate === `${pickerYear}-${String(index + 1).padStart(2, '0')}`
                                    const isFutureMonth = pickerYear > currentYear || (pickerYear === currentYear && index > currentMonthIndex)
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => handleSelectMonth(index)}
                                            disabled={isFutureMonth}
                                            className={`py-4 rounded-2xl text-[15px] font-semibold transition-all active:scale-95 ${isSelected
                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                                : isFutureMonth
                                                    ? 'bg-gray-100 dark:bg-gray-700/30 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                    : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                                                }`}
                                        >
                                            {name}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>

            <div className="mb-8">
                <h2 className="section-title">HISOBOT</h2>
                <div className="card bg-white dark:bg-gray-800 p-3">
                    <div className="flex items-start justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-2.5">
                        <div>
                            <p className="text-[14px] font-semibold text-gray-900 dark:text-white">Berilgan nasiyalar</p>
                            <p className="text-[12px] text-gray-400">Sizga qarzdor</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[16px] font-bold text-red-500">{formatCurrency(reportStats.debts)}</p>
                            <p className="text-[11px] text-gray-400">so'm · {reportStats.debtCount} ta nasiya</p>
                        </div>
                    </div>
                    <div className="flex items-start justify-between gap-3 pt-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                <ArrowDownRight size={18} className="text-green-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[14px] font-semibold text-gray-900 dark:text-white">Qabul qilingan to'lovlar</p>
                                <p className="text-[11px] text-gray-400">Mijozlardan olingan</p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[16px] font-bold text-green-500">{formatCurrency(reportStats.payments)}</p>
                            <p className="text-[11px] text-gray-400">so'm</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* SO'NGGI FAOLIYAT */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="section-title !mb-0">SO'NGGI FAOLIYAT</h2>
                    <Link to="/payments" className="text-[12px] font-semibold text-blue-500">Barchasi</Link>
                </div>
                {combinedActivity.length === 0 ? (
                    <div className="card text-center py-12 text-gray-400">
                        <Receipt size={40} className="mx-auto mb-2 opacity-20" />
                        <p>Faoliyat yo'q</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {combinedActivity.map((item) => (
                            <Link
                                key={`${item.type}-${item.id}`}
                                to={item.type === 'debt' ? `/debts/${item.id}` : `/debts/${item.debt_id}`}
                                className="card flex items-center gap-3 py-3 active:scale-[0.99] transition-transform"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'debt' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'
                                    }`}>
                                    {item.type === 'debt' ? (
                                        <ArrowUpRight size={20} className="text-red-500" />
                                    ) : (
                                        <ArrowDownRight size={20} className="text-green-500" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[15px] font-bold text-gray-900 dark:text-white truncate">
                                        {item.customer?.name || item.debt?.customer?.name || 'Mijoz'}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                        <Clock size={12} />
                                        {formatDate(item.created_at || item.paid_at)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-[15px] font-bold ${item.type === 'debt' ? 'text-red-500' : 'text-green-500'}`}>
                                        {item.type === 'debt' ? '+' : ''}{formatCurrency(item.total_amount || item.amount)}
                                    </p>
                                    <p className="text-[10px] text-gray-400">so'm</p>
                                </div>
                                <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            <div className="h-24" />
        </div>
    )
}
