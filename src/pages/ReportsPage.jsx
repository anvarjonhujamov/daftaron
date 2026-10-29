import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { reportsApi } from '../api/reports.api'
import { staffApi } from '../api/staff.api'
import { useSession } from '../app/session'
import { useResource } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import { Avatar, Card, EmptyState, ErrorState, KpiCard, List, Money, PageHeader, Row, SectionTitle, Skeleton } from '../ui/display'
import { Button, Chips } from '../ui/controls'
import { formatDate } from '../utils/date'
import { formatNumber } from '../utils/format'
import { formatPhone } from '../utils/phone'

const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']
const shortLabel = (ymd, monthly) => {
    const [, m, d] = String(ymd).split('-')
    return monthly ? MONTHS[Number(m) - 1] : `${Number(d)}`
}

// Nasiya va to'lov dinamikasi: ikki ustunli diagramma (ming so'm)
function Dynamics({ data }) {
    if (!data?.length) return <p className="py-6 text-center text-sm text-ink-2">Bu davrda amal yo'q.</p>
    const max = Math.max(1, ...data.map((p) => Math.max(p.given || 0, p.collected || 0)))
    // 62 kundan uzun davrda backend oylik nuqtalar beradi ("YYYY-MM" yoki oyning 1-kuni)
    const monthly = data.length > 1 && data.every((p) => String(p.date).length === 7 || String(p.date).endsWith('-01'))
    const totalGiven = data.reduce((s, p) => s + (p.given || 0), 0)
    const totalCollected = data.reduce((s, p) => s + (p.collected || 0), 0)
    const step = Math.ceil(data.length / 12)
    return (
        <figure>
            <div className="mb-3 flex gap-4 text-[13px] font-semibold text-ink-2">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-debt" />Nasiya</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-pay" />To'lov</span>
            </div>
            <div role="img" aria-label={`Davr bo'yicha: nasiya ${formatNumber(totalGiven)}, to'lov ${formatNumber(totalCollected)} so'm`}
                className="flex h-44 items-end gap-[3px] border-b border-line">
                {data.map((p) => (
                    <div key={p.date} className="flex h-full min-w-0 flex-1 items-end justify-center gap-px" title={`${formatDate(p.date)}: nasiya ${formatNumber(p.given)}, to'lov ${formatNumber(p.collected)}`}>
                        <div className="w-1/2 max-w-[14px] rounded-t bg-debt" style={{ height: `${((p.given || 0) / max) * 100}%` }} />
                        <div className="w-1/2 max-w-[14px] rounded-t bg-pay" style={{ height: `${((p.collected || 0) / max) * 100}%` }} />
                    </div>
                ))}
            </div>
            <div className="mt-1 flex gap-[3px] text-[11px] text-ink-3" aria-hidden>
                {data.map((p, i) => <span key={p.date} className="min-w-0 flex-1 text-center">{i % step === 0 ? shortLabel(p.date, monthly) : ''}</span>)}
            </div>
        </figure>
    )
}

export default function ReportsPage() {
    const session = useSession()
    const [period, setPeriod] = useState('month')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [staffId, setStaffId] = useState('')
    const [staff, setStaff] = useState([])
    const [exporting, setExporting] = useState(false)
    const allowed = session.can('reports.view')

    const params = period === 'custom' ? { from, to, staff_id: staffId } : { period, staff_id: staffId }
    const res = useResource(() => reportsApi.get(params), [period, from, to, staffId],
        { enabled: allowed && (period !== 'custom' || (from && to)), cacheKey: period === 'month' && !staffId ? 'report_month' : undefined })
    useEffect(() => {
        if (session.can('staff.manage')) staffApi.list().then((r) => setStaff(r.data || [])).catch(() => {})
    }, [])

    const exportXlsx = async () => {
        setExporting(true)
        try { await reportsApi.exportXlsx(params) } catch (err) { toast.error(errorMessage(err)) } finally { setExporting(false) }
    }

    if (!allowed) {
        return <div className="page"><PageHeader title="Hisobot" /><EmptyState icon={BarChart3} title="Hisobotni ko'rishga huquqingiz yo'q" text="Do'kon egasidan «Hisobotni ko'rish» huquqini so'rang." /></div>
    }

    const r = res.data
    const rate = r?.return_rate
    return (
        <div className="page">
            <PageHeader title="Hisobot" actions={<Button variant="secondary" icon={FileSpreadsheet} loading={exporting} onClick={exportXlsx}><span className="hidden sm:inline">Excel'ga yuklash</span><span className="sm:hidden">Excel</span></Button>} />
            <div className="flex flex-wrap items-center gap-2">
                <Chips size="sm" wrap ariaLabel="Davr" value={period} onChange={setPeriod} options={[
                    { value: 'day', label: 'Kun' }, { value: 'week', label: 'Hafta' }, { value: 'month', label: 'Oy' }, { value: 'year', label: 'Yil' }, { value: 'custom', label: 'Oraliq' }
                ]} />
                {period === 'custom' && (
                    <>
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Sanadan" className="h-9 rounded-xl border-[1.5px] border-line-2 bg-card px-2 text-sm text-ink" />
                        <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label="Sanagacha" className="h-9 rounded-xl border-[1.5px] border-line-2 bg-card px-2 text-sm text-ink" />
                    </>
                )}
                {staff.length > 0 && (
                    <select value={staffId} onChange={(e) => setStaffId(e.target.value)} aria-label="Xodim" className="h-9 rounded-xl border-[1.5px] border-line-2 bg-card px-2 text-sm font-semibold text-ink">
                        <option value="">Barcha xodimlar</option>
                        {staff.map((s) => <option key={s.id} value={s.user_id}>{s.name}</option>)}
                    </select>
                )}
            </div>
            {r?.period && <p className="mt-2 text-sm text-ink-2">{formatDate(r.period.from)} — {formatDate(r.period.to)}</p>}

            {res.error && !r ? <ErrorState onRetry={res.reload} /> : !r ? (
                period === 'custom' && !(from && to)
                    ? <p className="mt-6 text-[15px] text-ink-2">Davr boshi va oxirini tanlang.</p>
                    : <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
            ) : (
                <>
                    <div className="mt-4 grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
                        <KpiCard label="Berilgan nasiya" value={r.given?.amount} tone="debt" hint={`${formatNumber(r.given?.count)} ta`} />
                        <KpiCard label="Qaytgan to'lov" value={r.collected?.amount} tone="pay" hint={`${formatNumber(r.collected?.count)} ta`} />
                        <KpiCard label="Hali qaytmagan" value={r.outstanding?.amount} hint={`${formatNumber(r.outstanding?.customers)} mijozda`} />
                        <KpiCard label="Qaytish darajasi" value={<span className="font-extrabold">{rate !== null && rate !== undefined ? `${Math.round(rate)}%` : '—'}</span>}
                            hint={r.previous_return_rate !== null && r.previous_return_rate !== undefined ? `o'tgan davr: ${Math.round(r.previous_return_rate)}%` : undefined} />
                    </div>
                    {(r.overdue?.amount > 0 || r.written_off > 0) && (
                        <div className="mt-2 grid grid-cols-2 gap-2 md:gap-4">
                            <KpiCard label="Muddati o'tgan" value={r.overdue?.amount} tone="debt" hint={<Link to="/overdue" className="font-semibold text-brand-strong">{formatNumber(r.overdue?.customers)} mijoz</Link>} />
                            <KpiCard label="Hisobdan chiqarilgan" value={r.written_off} tone="muted" />
                        </div>
                    )}

                    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
                        <div className="min-w-0">
                            <SectionTitle>Dinamika, so'm</SectionTitle>
                            <Card className="p-4"><Dynamics data={r.dynamics} /></Card>
                            {r.staff?.length > 0 && (
                                <>
                                    <SectionTitle>Xodimlar kesimi</SectionTitle>
                                    <List>
                                        {r.staff.map((s) => (
                                            <Row key={s.user_id} left={<Avatar name={s.name} size={36} />} title={s.name}
                                                subtitle={`${formatNumber(s.debts_count)} nasiya · ${formatNumber(s.given)} berdi`}
                                                right={<><div className="text-[13px] text-ink-2">undirdi</div><Money value={s.collected} tone="pay" className="text-[15px]" /></>} />
                                        ))}
                                    </List>
                                </>
                            )}
                        </div>
                        <div>
                            <SectionTitle>Eng katta qarzdorlar</SectionTitle>
                            {r.top_debtors?.length ? (
                                <List>
                                    {r.top_debtors.map((d, i) => (
                                        <Row key={d.customer_id} to={`/customers/${d.customer_id}`} left={<span className="w-5 text-center font-bold text-ink-3">{i + 1}</span>}
                                            title={d.name} subtitle={formatPhone(d.phone)} right={<Money value={d.debt} tone="debt" className="text-[15px]" />} />
                                    ))}
                                </List>
                            ) : <Card className="p-4 text-[15px] text-ink-2">Qarzdor yo'q.</Card>}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
