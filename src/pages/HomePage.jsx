import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, Plus, Check, Search, ArrowDown, ArrowUp, Wallet, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { dashboardApi } from '../api/reports.api'
import { debtsApi, overdueApi } from '../api/debts.api'
import { useSession } from '../app/session'
import { useActions } from '../app/actions'
import { useOnChange, useResource } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import { Avatar, Card, CountBadge, KpiCard, List, ListSkeleton, Money, Pill, Row, SectionTitle, Skeleton, Table } from '../ui/display'
import { Button } from '../ui/controls'
import { Confirm } from '../ui/Sheet'
import { addDaysYmd, dueInfo, formatDate, todayYmd, toYmd } from '../utils/date'
import { formatNumber } from '../utils/format'
import { formatPhone } from '../utils/phone'

const DUE_SOON_DAYS = 3

// Muddati o'tganlar (/overdue) + 3 kun ichida qaytarishi kerak bo'lganlar (ochiq nasiyalardan)
function useDueRows() {
    const overdue = useResource(() => overdueApi.list(), [], { cacheKey: 'home_overdue' })
    const open = useResource(() => debtsApi.list({ status: 'open', per_page: 100 }), [], { cacheKey: 'home_open_debts' })
    useOnChange(() => { overdue.reload(); open.reload() })

    const rows = useMemo(() => {
        const today = todayYmd()
        const limit = addDaysYmd(today, DUE_SOON_DAYS)
        const soon = new Map()
        for (const d of open.data?.data || []) {
            const due = toYmd(d.return_date)
            if (!due || due < today || due > limit) continue
            const prev = soon.get(d.customer_id)
            soon.set(d.customer_id, {
                key: `s${d.customer_id}`,
                customer_id: d.customer_id,
                name: d.customer?.name || d.customer_name,
                phone: d.customer?.phone,
                amount: (prev?.amount || 0) + Number(d.remaining_amount || 0),
                due: prev && prev.due < due ? prev.due : due
            })
        }
        const late = (overdue.data?.data || []).map((c) => ({
            key: `o${c.customer_id}`, customer_id: c.customer_id, name: c.name, phone: c.phone,
            amount: c.overdue_amount, due: c.oldest_due_date, overdue: true
        }))
        return [...late.sort((a, b) => a.due.localeCompare(b.due)), ...[...soon.values()].sort((a, b) => a.due.localeCompare(b.due))]
    }, [overdue.data, open.data])

    return { rows, summary: overdue.data?.summary, loading: overdue.loading && !overdue.data, reload: overdue.reload }
}

const dueTone = { danger: 'danger', warn: 'warn', muted: 'muted' }

export default function HomePage() {
    const session = useSession()
    const actions = useActions()
    const navigate = useNavigate()
    const stats = useResource(() => dashboardApi.stats(), [], { cacheKey: 'dashboard' })
    useOnChange(() => stats.reload())
    const { rows, summary, loading, reload } = useDueRows()
    const [remind, setRemind] = useState(null)
    const [query, setQuery] = useState('')
    const s = stats.data || {}
    const today = todayYmd()

    const sendReminder = async () => {
        try {
            const res = await overdueApi.bulkSms([remind.customer_id], false)
            toast.success(res.sent ? 'Eslatma SMS yuborildi' : 'SMS yuborilmadi')
            reload()
        } catch (err) {
            toast.error(errorMessage(err))
        } finally {
            setRemind(null)
        }
    }

    const statusCell = (r) => {
        const info = dueInfo(r.due)
        return <Pill tone={dueTone[info?.tone] || 'muted'}>{info?.label}</Pill>
    }

    return (
        <div className="page">
            {/* Telefon sarlavhasi */}
            <div className="mb-2 flex items-center justify-between md:hidden">
                <Link to={session.isOwner ? '/shops' : '/settings'} className="flex h-11 min-w-0 items-center gap-2 text-lg font-extrabold">
                    <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
                    <span className="truncate">{session.tenant?.name || 'DaftarOn'}</span>
                    <ChevronDown size={18} className="shrink-0 text-ink-2" aria-hidden />
                </Link>
                <div className="flex gap-1">
                    <Link to="/customers" aria-label="Qidirish" className="flex h-11 w-11 items-center justify-center rounded-xl bg-card"><Search size={20} aria-hidden /></Link>
                    <Link to="/notifications" aria-label="Bildirishnomalar" className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-card">
                        <Bell size={20} aria-hidden />
                        <CountBadge count={session.unread} className="absolute -right-1 -top-1" />
                    </Link>
                </div>
            </div>

            {/* Kompyuter sarlavhasi */}
            <div className="mb-6 hidden items-center gap-3 md:flex">
                <h1 className="flex-1 text-[26px] font-extrabold tracking-tight">Bugun, {formatDate(today)}</h1>
                <form className="w-full max-w-sm" onSubmit={(e) => { e.preventDefault(); navigate(`/customers?q=${encodeURIComponent(query)}`) }}>
                    <label className="flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-line-2 bg-card px-3 focus-within:border-brand">
                        <Search size={18} className="text-ink-3" aria-hidden />
                        <input data-search value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Mijozni qidirish — ism yoki telefon" aria-label="Mijozni qidirish"
                            className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-3" />
                        <kbd className="rounded border border-line px-1.5 text-xs text-ink-3">/</kbd>
                    </label>
                </form>
                <Button variant="dark" icon={Plus} onClick={() => actions.openDebt()}>Nasiya <kbd className="ml-1 rounded bg-white/20 px-1.5 text-xs">N</kbd></Button>
                <Button variant="pay" icon={Check} onClick={() => actions.openPayment()}>To'lov <kbd className="ml-1 rounded bg-white/20 px-1.5 text-xs">T</kbd></Button>
            </div>

            {/* Telefon: asosiy karta */}
            <div className="rounded-[20px] bg-brand p-5 text-white md:hidden">
                <div className="text-sm font-semibold opacity-90">Sizga qarzdorlar</div>
                <div className="mt-1 text-[34px] font-extrabold leading-tight tracking-tight">
                    {stats.data ? formatNumber(s.remaining_debt) : '—'} <span className="text-lg font-semibold">so'm</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span><strong>{formatNumber(s.total_customers)}</strong> mijoz</span>
                    {summary?.count > 0 && (
                        <Link to="/overdue" className="underline-offset-2 hover:underline">
                            Muddati o'tgan: <strong>{summary.count} ta · {formatNumber(summary.total_amount)}</strong>
                        </Link>
                    )}
                </div>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2.5 md:hidden">
                <Button variant="dark" size="lg" icon={Plus} onClick={() => actions.openDebt()}>Nasiya</Button>
                <Button variant="secondary" size="lg" icon={Check} className="[&>svg]:text-pay" onClick={() => actions.openPayment()}>To'lov olish</Button>
            </div>

            {/* KPI: telefonda «Bugun» 3 ustun, kompyuterda 4 karta */}
            <SectionTitle className="md:hidden">Bugun</SectionTitle>
            <div className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-4">
                <KpiCard className="hidden md:block" label="Sizga qarzdorlar" value={s.remaining_debt} hint={`${formatNumber(s.total_customers)} mijoz`} />
                <KpiCard className="hidden md:block" label="Muddati o'tgan" value={summary?.total_amount ?? null} tone="debt"
                    hint={summary?.count > 0
                        ? <>{formatNumber(summary.count)} mijoz · <Link to="/overdue" className="font-semibold text-brand-strong">Hammasini eslatish</Link></>
                        : 'Qaytarish sanasi o\'tganlar yo\'q'} />
                <KpiCard label={<><span className="md:hidden">Nasiya</span><span className="hidden md:inline">Bugun nasiya</span></>} value={s.today_debts} tone="debt" icon={ArrowDown} iconTone="bg-debt-soft text-debt md:hidden" />
                <KpiCard label={<><span className="md:hidden">To'lov</span><span className="hidden md:inline">Bugun to'lov</span></>} value={s.today_payments} tone="pay" icon={ArrowUp} iconTone="bg-pay-soft text-pay md:hidden" />
                <KpiCard className="md:hidden" label="Ta'minotchiga" value={s.today_supplier_payments} tone="supp" icon={Wallet} iconTone="bg-supp-soft text-supp" />
            </div>
            {stats.loading && !stats.data && <Skeleton className="mt-2 h-2 w-24" />}

            <SectionTitle action={<Link to="/customers" className="text-sm font-semibold text-brand-strong">Barcha mijozlar</Link>}>
                Qaytarish muddati yaqin va o'tganlar{rows.length > 0 && ` · ${rows.length}`}
            </SectionTitle>
            {loading ? <ListSkeleton rows={3} /> : rows.length === 0 ? (
                <Card className="p-5 text-[15px] text-ink-2">Yaqin 3 kunda qaytarishi kerak bo'lgan va muddati o'tgan qarz yo'q.</Card>
            ) : (
                <>
                    <List className="md:hidden">
                        {rows.slice(0, 8).map((r) => (
                            <Row key={r.key} to={`/customers/${r.customer_id}`} left={<Avatar name={r.name} />} title={r.name} subtitle={formatPhone(r.phone)}
                                right={<><Money value={r.amount} tone="debt" className="block text-[15px]" /><span className="text-xs">{statusCell(r)}</span></>} />
                        ))}
                    </List>
                    <Table
                        className="hidden md:block"
                        rowKey="key"
                        rows={rows}
                        onRowClick={(r) => navigate(`/customers/${r.customer_id}`)}
                        columns={[
                            { key: 'name', label: 'Mijoz', render: (r) => <span className="flex items-center gap-3 font-bold"><Avatar name={r.name} size={32} />{r.name}</span> },
                            { key: 'phone', label: 'Telefon', render: (r) => <span className="text-ink-2">{formatPhone(r.phone)}</span> },
                            { key: 'amount', label: "Qarz, so'm", align: 'right', render: (r) => <Money value={r.amount} tone="debt" /> },
                            { key: 'due', label: 'Muddat', render: (r) => <span className="flex items-center gap-2">{statusCell(r)}<span className="text-sm text-ink-2">{formatDate(r.due)}</span></span> },
                            {
                                key: 'act', label: 'Amal', align: 'right', render: (r) => r.overdue
                                    ? <Button size="sm" variant="secondary" icon={MessageSquare} onClick={(e) => { e.stopPropagation(); setRemind(r) }}>SMS eslatish</Button>
                                    : <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); actions.openPayment({ customer: { id: r.customer_id, name: r.name, phone: r.phone } }) }}>To'lov</Button>
                            }
                        ]}
                    />
                    <p className="mt-3 hidden text-[13px] text-ink-3 lg:block">Tezkor tugmalar: N — nasiya, T — to'lov, M — yangi mijoz, / — qidiruv.</p>
                </>
            )}

            <Confirm
                open={!!remind}
                onClose={() => setRemind(null)}
                onConfirm={sendReminder}
                title="Eslatma yuborish"
                text={remind && `${remind.name}ga muddati o'tgan qarz (${formatNumber(remind.amount)} so'm) haqida SMS ketadi.`}
                confirmText="Yuborish"
            />
        </div>
    )
}
