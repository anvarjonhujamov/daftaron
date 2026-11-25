import { Link } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { Card, Money, Pill } from '../ui/display'
import { Button } from '../ui/controls'
import { formatDate, formatDateTime } from '../utils/date'
import { t, tk } from '../i18n'

// Nasiya holati (backend `state`, TZ 28.4)
export const debtState = (d) => {
    switch (d.state) {
        case 'overdue': return { tone: 'danger', label: d.days_overdue ? t('Kechikkan {n} kun', { n: d.days_overdue }) : t('Kechikkan') }
        case 'partially_paid': return { tone: 'warn', label: t("Qisman to'langan") }
        case 'paid': return { tone: 'success', label: t("To'langan") }
        case 'closed_manually': return { tone: 'muted', label: t("Qo'lda yopilgan") }
        case 'cancelled': return { tone: 'muted', label: t('Bekor qilingan') }
        default: return d.status === 'closed' ? { tone: 'success', label: t("To'langan") } : { tone: 'info', label: t('Faol') }
    }
}

// Qaytarish kuni SMS eslatmasi holati
export const reminderStatus = (status) => ({
    sent: { tone: 'success', label: t('SMS yuborildi') },
    failed: { tone: 'danger', label: t('SMS xato · qayta urinadi') },
    queued: { tone: 'muted', label: t('SMS navbatda') },
    skipped_limit: { tone: 'warn', label: t('SMS limiti tugagan') },
    skipped_no_phone: { tone: 'warn', label: t("Raqam yo'q") },
    pending: { tone: 'muted', label: t('SMS rejalashtirilgan') }
}[status] || null)

// SMS holati (sms_dispatch_logs)
export const SMS_STATUS = {
    delivered: { tone: 'success', label: tk('Yetkazildi') },
    sent: { tone: 'info', label: tk('Yuborildi') },
    queued: { tone: 'muted', label: tk('Navbatda') },
    failed: { tone: 'danger', label: tk('Yetkazilmadi') }
}

// Matnlar o'zbekcha saqlanadi, ko'rsatishda t(): t(SMS_TYPES[type])
export const SMS_TYPES = {
    debt_created: tk('Nasiya yozilgani haqida'),
    payment_received: tk("To'lov qabul qilingani haqida"),
    due_reminder: tk('Qaytarish kuni eslatma'),
    overdue_reminder: tk("Muddati o'tgan eslatma"),
    staff_invite: tk('Xodimga taklif'),
    otp: tk('Kirish kodi')
}

export const METHODS = { cash: tk('naqd'), card: tk('karta'), transfer: tk("o'tkazma") }
export const methodLabel = (m) => (METHODS[m] ? t(METHODS[m]) : m)

export function Progress({ value, total }) {
    const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0
    return (
        <div className="h-2 overflow-hidden rounded-full bg-soft" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("To'langan qism")}>
            <div className="h-full rounded-full bg-pay-strong" style={{ width: `${pct}%` }} />
        </div>
    )
}

export function DebtCard({ debt, onPay, canPay, onEdit }) {
    const st = debtState(debt)
    const sms = debt.status === 'open' && reminderStatus(debt.return_date_sms_status)
    const total = Number(debt.total_amount || 0)
    const paid = Number(debt.total_paid_amount ?? total - Number(debt.remaining_amount || 0))
    return (
        <Card className="p-4">
            <div className="flex flex-wrap items-center gap-2">
                <strong className="text-[15px]">{t('Nasiya #{id}', { id: debt.id })}</strong>
                <Pill tone={st.tone}>{st.label}</Pill>
                {sms && <Pill tone={sms.tone}>{sms.label}</Pill>}
                <span className="ml-auto text-[13px] text-ink-3">
                    {formatDate(debt.debt_date)}{debt.created_by?.name && ` · ${debt.created_by.name}`}
                </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm [&>div]:min-w-[104px] [&>div]:flex-1">
                <div><div className="text-ink-2">{t('Berildi')}</div><Money value={total} className="text-base" /></div>
                <div><div className="text-ink-2">{t("To'landi")}</div><Money value={paid} tone="pay" className="text-base" /></div>
                <div><div className="text-ink-2">{t('Qoldi')}</div><Money value={debt.remaining_amount} tone={debt.remaining_amount > 0 ? 'debt' : 'muted'} className="text-base" /></div>
                <div><div className="text-ink-2">{t('Qaytarish')}</div><strong className="text-base">{formatDate(debt.return_date)}</strong></div>
            </div>
            <div className="mt-3"><Progress value={paid} total={total} /></div>
            {debt.description && <p className="mt-2 text-sm text-ink-2">{t('Izoh:')} {debt.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
                {debt.status === 'open' && canPay && <Button size="sm" variant="pay" onClick={() => onPay(debt)}>{t("Shu nasiyaga to'lov")}</Button>}
                <Link to={`/debts/${debt.id}`} className="inline-flex h-9 items-center rounded-[10px] px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">{t('Batafsil')}</Link>
                {debt.status === 'open' && onEdit && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => onEdit(debt, paid)}>{t('Tahrirlash')}</Button>}
            </div>
        </Card>
    )
}

export function SmsRow({ sms, onRetry, retrying }) {
    const st = SMS_STATUS[sms.status] || SMS_STATUS.queued
    return (
        <div className="flex items-center gap-3 px-3.5 py-3">
            <div className="min-w-0 flex-1 text-[15px] leading-snug">
                <div className="font-bold">{t(SMS_TYPES[sms.type]) || t('SMS')}</div>
                <div className="truncate text-[13px] text-ink-3">{formatDateTime(sms.sent_at)}{sms.error && ` · ${sms.error}`}</div>
            </div>
            <Pill tone={st.tone}>{t(st.label)}</Pill>
            {sms.can_retry && onRetry && <Button size="sm" variant="secondary" loading={retrying} onClick={() => onRetry(sms)}>{t('Qayta')}</Button>}
        </div>
    )
}

export const paymentLine = (p) => `${formatDateTime(p.at || p.paid_at)}${p.method ? ` · ${methodLabel(p.method)}` : ''}${p.staff?.name ? ` · ${p.staff.name}` : ''}`
