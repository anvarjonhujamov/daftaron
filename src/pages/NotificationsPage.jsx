import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlarmClock, ArrowDown, ArrowUp, Bell, CreditCard, MessageSquareWarning, Send, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { notificationsApi } from '../api/reports.api'
import { useSession } from '../app/session'
import { errorMessage } from '../lib/errors'
import { Card, EmptyState, ErrorState, ListSkeleton, PageHeader } from '../ui/display'
import { Button, Chips, cx } from '../ui/controls'
import { dayTitle, formatTime, toYmd } from '../utils/date'

const CATEGORY = {
    overdue_today: { icon: AlarmClock, cls: 'bg-debt-soft text-debt' },
    payment_received: { icon: ArrowUp, cls: 'bg-pay-soft text-pay' },
    debt_created: { icon: ArrowDown, cls: 'bg-debt-soft text-debt' },
    sms_failed: { icon: MessageSquareWarning, cls: 'bg-warn-soft text-warn' },
    balance_low: { icon: CreditCard, cls: 'bg-warn-soft text-warn' },
    subscription_renewal: { icon: CreditCard, cls: 'bg-brand-soft text-brand-strong' },
    balance_topped_up: { icon: CreditCard, cls: 'bg-pay-soft text-pay' },
    digest_sent: { icon: Send, cls: 'bg-brand-soft text-brand-strong' },
    system: { icon: Info, cls: 'bg-soft text-ink-2' }
}

const FILTERS = [
    { value: '', label: 'Hammasi' },
    { value: 'overdue_today', label: "Muddati o'tgan" },
    { value: 'payment_received', label: "To'lovlar" },
    { value: 'debt_created', label: 'Nasiyalar' },
    { value: 'sms_failed', label: 'SMS' },
    { value: 'balance_low', label: 'Balans' },
    { value: 'subscription_renewal', label: 'Obuna' }
]

const target = (link) => {
    if (!link) return null
    switch (link.type) {
        case 'debt': return link.id ? `/debts/${link.id}` : null
        case 'customer': return link.id ? `/customers/${link.id}` : null
        case 'overdue': return '/overdue'
        case 'subscription': return '/subscription'
        case 'sms': return '/history?type=sms'
        default: return null
    }
}

export default function NotificationsPage() {
    const navigate = useNavigate()
    const session = useSession()
    const [type, setType] = useState('')
    const [items, setItems] = useState([])
    const [page, setPage] = useState(1)
    const [meta, setMeta] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const load = async (p = 1) => {
        setLoading(true)
        setError(null)
        try {
            const r = await notificationsApi.list({ type, page: p })
            setItems((prev) => (p === 1 ? r.data || [] : [...prev, ...(r.data || [])]))
            setMeta(r.meta)
            setPage(p)
            if (r.unread_count !== undefined) session.setUnread(r.unread_count)
        } catch (err) {
            setError(err)
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => { load(1) }, [type])

    const markAll = async () => {
        try {
            await notificationsApi.markRead('all')
            setItems((x) => x.map((n) => ({ ...n, is_read: true })))
            session.setUnread(0)
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }

    const open = (n) => {
        if (!n.is_read) {
            notificationsApi.markRead([n.id]).then(() => session.refreshUnread()).catch(() => {})
            setItems((x) => x.map((i) => (i.id === n.id ? { ...i, is_read: true } : i)))
        }
        const to = target(n.link)
        if (to) navigate(to)
    }

    // Kun bo'yicha guruhlash
    const groups = []
    for (const n of items) {
        const day = toYmd(n.created_at)
        const last = groups[groups.length - 1]
        if (last?.day === day) last.items.push(n)
        else groups.push({ day, items: [n] })
    }

    return (
        <div className="page md:max-w-3xl">
            <PageHeader back title="Bildirishnomalar" actions={session.unread > 0 && <Button size="sm" variant="ghost" onClick={markAll}>Hammasini o'qish</Button>} />
            <Chips size="sm" ariaLabel="Turi" value={type} onChange={setType} options={FILTERS} />
            <div className="mt-4">
                {error && !items.length ? <ErrorState onRetry={() => load(1)} /> : loading && !items.length ? <ListSkeleton /> : items.length === 0 ? (
                    <EmptyState icon={Bell} title="Bildirishnoma yo'q" text="Muddati o'tgan qarzlar, to'lovlar va SMS holati shu yerda ko'rinadi." />
                ) : (
                    <div className="space-y-4">
                        {groups.map((g) => (
                            <section key={g.day}>
                                <h2 className="mb-2 section-label">{dayTitle(g.day)}</h2>
                                <Card className="divide-y divide-line overflow-hidden">
                                    {g.items.map((n) => {
                                        const c = CATEGORY[n.category] || CATEGORY.system
                                        return (
                                            <button key={n.id} type="button" onClick={() => open(n)}
                                                className={cx('flex w-full items-start gap-3 px-3.5 py-3 text-left hover:bg-soft/60', !n.is_read && 'bg-brand-soft/50')}>
                                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${c.cls}`}><c.icon size={17} aria-hidden /></span>
                                                <span className="min-w-0 flex-1 text-[15px] leading-snug">
                                                    <span className={cx('block', !n.is_read ? 'font-bold' : 'font-medium')}>{n.message || n.data?.message || 'Bildirishnoma'}</span>
                                                    <span className="text-[13px] text-ink-3">{formatTime(n.created_at)}</span>
                                                </span>
                                                {!n.is_read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label="O'qilmagan" />}
                                            </button>
                                        )
                                    })}
                                </Card>
                            </section>
                        ))}
                        {meta && page < meta.last_page && <Button variant="secondary" block loading={loading} onClick={() => load(page + 1)}>Yana ko'rsatish</Button>}
                    </div>
                )}
            </div>
        </div>
    )
}
