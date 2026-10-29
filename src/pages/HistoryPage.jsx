import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, FileSpreadsheet, History, MessageSquare, Search, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { historyApi } from '../api/reports.api'
import { staffApi } from '../api/staff.api'
import { useSession } from '../app/session'
import { useDebounced, useOnChange } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import { METHODS, SMS_STATUS } from '../features/debt-ui'
import { Card, EmptyState, ErrorState, List, ListSkeleton, Money, PageHeader, Pill, Row } from '../ui/display'
import { Button, Chips } from '../ui/controls'
import { dayTitle, formatTime } from '../utils/date'
import { formatNumber } from '../utils/format'

const KIND = {
    debt: { icon: ArrowDown, cls: 'bg-debt-soft text-debt', label: 'nasiya', tone: 'debt', sign: '+' },
    payment: { icon: ArrowUp, cls: 'bg-pay-soft text-pay', label: "to'lov", tone: 'pay', sign: '−' },
    sms: { icon: MessageSquare, cls: 'bg-brand-soft text-brand-strong', label: 'SMS' },
    supplier_purchase: { icon: Truck, cls: 'bg-supp-soft text-supp', label: 'xarid', tone: 'supp', sign: '+' },
    supplier_payment: { icon: ArrowUp, cls: 'bg-supp-soft text-supp', label: "to'lov", tone: 'supp', sign: '−' }
}

export function HistoryRow({ item, onOpen }) {
    const k = KIND[item.kind] || KIND.sms
    const who = item.customer?.name || item.supplier?.name || ''
    const sms = item.kind === 'sms' && SMS_STATUS[item.status]
    return (
        <Row
            onClick={onOpen ? () => onOpen(item) : undefined}
            left={<span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${k.cls}`}><k.icon size={16} aria-hidden /></span>}
            title={`${who}${who ? ' · ' : ''}${k.label}${item.method ? `, ${METHODS[item.method] || item.method}` : ''}`}
            subtitle={[formatTime(item.at), item.staff?.name, item.note].filter(Boolean).join(' · ')}
            right={sms ? <Pill tone={sms.tone}>{sms.label}</Pill> : item.amount !== null && item.amount !== undefined && <Money value={item.amount} tone={k.tone} sign={item.sign || k.sign} className="text-[15px]" />}
        />
    )
}

export default function HistoryPage() {
    const navigate = useNavigate()
    const session = useSession()
    const [params, setParams] = useSearchParams()
    const scope = params.get('scope') || 'customers'
    const type = params.get('type') || 'all'
    const [q, setQ] = useState('')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [staffId, setStaffId] = useState('')
    const query = useDebounced(q.trim(), 350)
    const [days, setDays] = useState([])
    const [cursor, setCursor] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [exporting, setExporting] = useState(false)
    const [staff, setStaff] = useState([])

    const set = (key, value) => setParams((p) => {
        const next = new URLSearchParams(p)
        next.set(key, value)
        if (key === 'scope') next.delete('type')
        return next
    }, { replace: true })

    const filters = { scope, type, q: query, from, to, staff_id: staffId }

    const load = async (more = false) => {
        setLoading(true)
        setError(null)
        try {
            const r = await historyApi.feed({ ...filters, cursor: more ? cursor : undefined, limit: 50 })
            const chunk = r.data || []
            setDays((prev) => {
                if (!more) return chunk
                // Kursor kun o'rtasida to'xtasa — bir xil kunni birlashtiramiz
                const merged = [...prev]
                for (const day of chunk) {
                    const last = merged[merged.length - 1]
                    if (last?.date === day.date) merged[merged.length - 1] = { ...last, items: [...last.items, ...day.items] }
                    else merged.push(day)
                }
                return merged
            })
            setCursor(r.next_cursor || null)
        } catch (err) {
            setError(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load(false) }, [scope, type, query, from, to, staffId])
    useOnChange(() => load(false))
    useEffect(() => {
        if (session.can('staff.manage')) staffApi.list().then((r) => setStaff(r.data || [])).catch(() => {})
    }, [])

    const exportXlsx = async () => {
        setExporting(true)
        try { await historyApi.exportXlsx(filters) } catch (err) { toast.error(errorMessage(err)) } finally { setExporting(false) }
    }

    const open = (item) => {
        if (item.kind === 'debt') navigate(`/debts/${item.debt_id || item.id}`)
        else if (item.kind.startsWith('supplier')) item.supplier?.id && navigate(`/suppliers/${item.supplier.id}`)
        else if (item.customer?.id) navigate(`/customers/${item.customer.id}`)
    }

    const types = scope === 'suppliers'
        ? [{ value: 'all', label: 'Hammasi' }, { value: 'debts', label: 'Xaridlar' }, { value: 'payments', label: "To'lovlar" }]
        : [{ value: 'all', label: 'Hammasi' }, { value: 'payments', label: "To'lovlar" }, { value: 'debts', label: 'Nasiyalar' }, { value: 'sms', label: 'SMS' }]

    if (!session.can('reports.view')) {
        return <div className="page"><PageHeader back title="Tarix" /><EmptyState icon={History} title="Tarixni ko'rishga huquqingiz yo'q" text="Do'kon egasidan «Hisobotni ko'rish» huquqini so'rang." /></div>
    }

    return (
        <div className="page">
            <PageHeader back title="Tarix" actions={<Button variant="secondary" icon={FileSpreadsheet} loading={exporting} onClick={exportXlsx}><span className="hidden sm:inline">Excel'ga yuklash</span><span className="sm:hidden">Excel</span></Button>} />
            <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                    <Chips size="sm" wrap ariaLabel="Kim bilan" value={scope} onChange={(v) => set('scope', v)} options={[{ value: 'customers', label: 'Mijozlar' }, { value: 'suppliers', label: "Ta'minotchilar" }]} />
                    <span className="hidden h-9 w-px bg-line sm:block" />
                    <Chips size="sm" wrap ariaLabel="Turi" value={type} onChange={(v) => set('type', v)} options={types} />
                </div>
                <div className="flex flex-wrap gap-2">
                    <label className="flex h-11 min-w-[200px] flex-1 items-center gap-2 rounded-xl border-[1.5px] border-line-2 bg-card px-3 focus-within:border-brand">
                        <Search size={18} className="text-ink-3" aria-hidden />
                        <input data-search value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, telefon yoki summa" aria-label="Qidirish" className="w-full bg-transparent text-[15px] outline-none" />
                    </label>
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Sanadan" className="h-11 rounded-xl border-[1.5px] border-line-2 bg-card px-2 text-sm text-ink" />
                    <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="Sanagacha" className="h-11 rounded-xl border-[1.5px] border-line-2 bg-card px-2 text-sm text-ink" />
                    {staff.length > 0 && (
                        <select value={staffId} onChange={(e) => setStaffId(e.target.value)} aria-label="Xodim" className="h-11 rounded-xl border-[1.5px] border-line-2 bg-card px-2 text-sm font-semibold text-ink">
                            <option value="">Barcha xodimlar</option>
                            {staff.map((s) => <option key={s.id} value={s.user_id}>{s.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div className="mt-4">
                {error && !days.length ? <ErrorState onRetry={() => load(false)} /> : loading && !days.length ? <ListSkeleton rows={6} /> : days.length === 0 ? (
                    <EmptyState icon={History} title="Hech narsa topilmadi" text="Filtrlarni o'zgartirib ko'ring." />
                ) : (
                    <div className="space-y-4">
                        {days.map((day) => (
                            <section key={day.date}>
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="section-label">{dayTitle(day.date)}</h2>
                                    <span className="text-[13px] text-ink-2">
                                        {day.totals?.debts > 0 && <span className="text-debt">+{formatNumber(day.totals.debts)} </span>}
                                        {day.totals?.payments > 0 && <span className="text-pay">−{formatNumber(day.totals.payments)} </span>}
                                        {day.totals?.sms > 0 && `· ${day.totals.sms} SMS`}
                                    </span>
                                </div>
                                <List>{day.items.map((item) => <HistoryRow key={`${item.kind}${item.id}`} item={item} onOpen={open} />)}</List>
                            </section>
                        ))}
                        {cursor && <Button variant="secondary" block loading={loading} onClick={() => load(true)}>Yana ko'rsatish</Button>}
                    </div>
                )}
            </div>
            {!loading && days.length > 0 && !cursor && <Card className="mt-4 p-3 text-center text-sm text-ink-3">Hammasi ko'rsatildi</Card>}
        </div>
    )
}
