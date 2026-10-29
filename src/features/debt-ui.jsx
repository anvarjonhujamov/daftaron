import { Link } from 'react-router-dom'
import { Card, Money, Pill } from '../ui/display'
import { Button } from '../ui/controls'
import { formatDate, formatDateTime } from '../utils/date'
import { formatNumber } from '../utils/format'

// Nasiya holati (backend `state`, TZ 28.4)
export const debtState = (d) => {
    switch (d.state) {
        case 'overdue': return { tone: 'danger', label: `Kechikkan${d.days_overdue ? ` ${d.days_overdue} kun` : ''}` }
        case 'partially_paid': return { tone: 'warn', label: "Qisman to'langan" }
        case 'paid': return { tone: 'success', label: "To'langan" }
        case 'closed_manually': return { tone: 'muted', label: "Qo'lda yopilgan" }
        case 'cancelled': return { tone: 'muted', label: 'Bekor qilingan' }
        default: return d.status === 'closed' ? { tone: 'success', label: "To'langan" } : { tone: 'info', label: 'Faol' }
    }
}

// Qaytarish kuni SMS eslatmasi holati
export const reminderStatus = (status) => ({
    sent: { tone: 'success', label: 'SMS yuborildi' },
    failed: { tone: 'danger', label: 'SMS xato · qayta urinadi' },
    skipped_limit: { tone: 'warn', label: 'SMS limiti tugagan' },
    skipped_no_phone: { tone: 'warn', label: "Raqam yo'q" },
    pending: { tone: 'muted', label: 'SMS rejalashtirilgan' }
}[status] || null)

// SMS holati (sms_dispatch_logs)
export const SMS_STATUS = {
    delivered: { tone: 'success', label: 'Yetkazildi' },
    sent: { tone: 'info', label: 'Yuborildi' },
    queued: { tone: 'muted', label: 'Navbatda' },
    failed: { tone: 'danger', label: 'Yetkazilmadi' }
}

export const SMS_TYPES = {
    debt_created: 'Nasiya yozilgani haqida',
    payment_received: "To'lov qabul qilingani haqida",
    due_reminder: 'Qaytarish kuni eslatma',
    overdue_reminder: "Muddati o'tgan eslatma",
    staff_invite: 'Xodimga taklif',
    otp: 'Kirish kodi'
}

export const METHODS = { cash: 'naqd', card: 'karta', transfer: "o'tkazma" }

export function Progress({ value, total }) {
    const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
    return (
        <div className="h-2 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="To'langan qism">
            <div className="h-full rounded-full bg-pay-strong" style={{ width: `${pct}%` }} />
        </div>
    )
}

export function DebtCard({ debt, onPay, canPay }) {
    const st = debtState(debt)
    const sms = debt.status === 'open' && reminderStatus(debt.return_date_sms_status)
    const total = Number(debt.total_amount || 0)
    const paid = Number(debt.total_paid_amount ?? total - Number(debt.remaining_amount || 0))
    return (
        <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
                <strong className="text-[15px]">Nasiya #{debt.id}</strong>
                <Pill tone={st.tone}>{st.label}</Pill>
                {sms && <Pill tone={sms.tone}>{sms.label}</Pill>}
                <span className="ml-auto text-[13px] text-ink-3">
                    {formatDate(debt.debt_date)}{debt.created_by?.name && ` · ${debt.created_by.name}`}
                </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm [&>div]:min-w-[104px] [&>div]:flex-1">
                <div><div className="text-ink-2">Berildi</div><Money value={total} className="text-base" /></div>
                <div><div className="text-ink-2">To'landi</div><Money value={paid} tone="pay" className="text-base" /></div>
                <div><div className="text-ink-2">Qoldi</div><Money value={debt.remaining_amount} tone={debt.remaining_amount > 0 ? 'debt' : 'muted'} className="text-base" /></div>
                <div><div className="text-ink-2">Qaytarish</div><strong className="text-base">{formatDate(debt.return_date)}</strong></div>
            </div>
            <div className="mt-3"><Progress value={paid} total={total} /></div>
            {debt.description && <p className="mt-2 text-sm text-ink-2">Izoh: {debt.description}</p>}
            <div className="mt-3 flex gap-2">
                {debt.status === 'open' && canPay && <Button size="sm" variant="pay" onClick={() => onPay(debt)}>Shu nasiyaga to'lov</Button>}
                <Link to={`/debts/${debt.id}`} className="inline-flex h-9 items-center rounded-[10px] px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">Batafsil</Link>
            </div>
        </Card>
    )
}

export function SmsRow({ sms, onRetry, retrying }) {
    const st = SMS_STATUS[sms.status] || SMS_STATUS.queued
    return (
        <div className="flex items-center gap-3 px-3.5 py-3">
            <div className="min-w-0 flex-1 text-[15px] leading-snug">
                <div className="font-bold">{SMS_TYPES[sms.type] || 'SMS'}</div>
                <div className="truncate text-[13px] text-ink-3">{formatDateTime(sms.sent_at)}{sms.error && ` · ${sms.error}`}</div>
            </div>
            <Pill tone={st.tone}>{st.label}</Pill>
            {sms.can_retry && onRetry && <Button size="sm" variant="secondary" loading={retrying} onClick={() => onRetry(sms)}>Qayta</Button>}
        </div>
    )
}

export const paymentLine = (p) => `${formatDateTime(p.at || p.paid_at)}${p.method ? ` · ${METHODS[p.method] || p.method}` : ''}${p.staff?.name ? ` · ${p.staff.name}` : ''}`

export const money = formatNumber
