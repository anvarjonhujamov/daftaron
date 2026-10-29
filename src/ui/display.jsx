import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, RefreshCw, WifiOff } from 'lucide-react'
import { cx, Button } from './controls'
import { avatarClass, formatNumber, initials } from '../utils/format'

export function Card({ as: Tag = 'div', className, children, ...rest }) {
    return <Tag className={cx('card', className)} {...rest}>{children}</Tag>
}

// Summa: rang ma'nosi bilan (debt — qizil, pay — yashil, supp — to'q sariq)
const TONES = { debt: 'text-debt', pay: 'text-pay', supp: 'text-supp', warn: 'text-warn', ink: 'text-ink', muted: 'text-ink-2' }

export function Money({ value, tone = 'ink', sign, suffix, className }) {
    const n = formatNumber(value)
    return (
        <span className={cx('whitespace-nowrap font-extrabold tabular-nums', TONES[tone], className)}>
            {n !== '—' && sign}{n}{suffix && n !== '—' && <span className="ml-1 text-[0.55em] font-semibold text-ink-2">so'm</span>}
        </span>
    )
}

// KPI kartasi: raqam to'liq ko'rinadi — joy yetmasa shrift kichrayadi, kesilmaydi
export function KpiCard({ label, value, tone = 'ink', hint, icon: Icon, iconTone, className, children, size }) {
    return (
        <Card className={cx('min-w-0 p-3.5 md:p-4', className)}>
            {Icon && (
                <span className={cx('mb-2 flex h-8 w-8 items-center justify-center rounded-full', iconTone)}>
                    <Icon size={16} strokeWidth={2.5} aria-hidden />
                </span>
            )}
            <div className="text-[13px] font-medium text-ink-2">{label}</div>
            <div className={cx('mt-0.5 break-words leading-tight', size === 'sm' ? 'text-xl' : 'text-[clamp(15px,4.2vw,26px)] md:text-[24px]')}>
                {typeof value === 'object' && value !== null ? value : <Money value={value} tone={tone} />}
            </div>
            {hint && <div className="mt-1 text-[13px] text-ink-2">{hint}</div>}
            {children}
        </Card>
    )
}

export function Avatar({ name, size = 40, className }) {
    return (
        <span
            aria-hidden
            style={{ width: size, height: size, fontSize: size * 0.42 }}
            className={cx('flex shrink-0 items-center justify-center rounded-full font-bold', avatarClass(name), className)}
        >
            {initials(name)}
        </span>
    )
}

const PILL_TONES = {
    danger: 'bg-debt-soft text-debt',
    warn: 'bg-warn-soft text-warn',
    success: 'bg-pay-soft text-pay',
    info: 'bg-brand-soft text-brand-strong',
    supp: 'bg-supp-soft text-supp',
    muted: 'bg-soft text-ink-2'
}

export function Pill({ tone = 'muted', children, className }) {
    return (
        <span className={cx('inline-flex items-center whitespace-nowrap rounded-[10px] px-2.5 py-1 text-[13px] font-bold', PILL_TONES[tone], className)}>
            {children}
        </span>
    )
}

export function CountBadge({ count, className }) {
    if (!count) return null
    return (
        <span className={cx('inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-danger px-1.5 text-xs font-bold text-white', className)}>
            {count > 99 ? '99+' : count}
        </span>
    )
}

// Sahifa sarlavhasi: telefonda orqaga tugmasi, o'ngda amallar
export function PageHeader({ title, subtitle, back, actions, className }) {
    const navigate = useNavigate()
    return (
        <header className={cx('mb-4 flex items-center gap-2 md:mb-6', className)}>
            {back && (
                <button
                    type="button"
                    aria-label="Orqaga"
                    onClick={() => (typeof back === 'string' ? navigate(back) : window.history.length > 1 ? navigate(-1) : navigate('/'))}
                    className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink hover:bg-soft"
                >
                    <ChevronLeft size={26} aria-hidden />
                </button>
            )}
            <div className="min-w-0 flex-1">
                <h1 className="truncate text-[22px] font-extrabold tracking-tight md:text-[26px]">{title}</h1>
                {subtitle && <p className="truncate text-[14px] text-ink-2">{subtitle}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
    )
}

export function SectionTitle({ children, action, className }) {
    return (
        <div className={cx('mb-2 mt-5 flex items-center justify-between gap-3', className)}>
            <h2 className="section-label">{children}</h2>
            {action}
        </div>
    )
}

// Ro'yxat qatori: chapda ikonka/avatar, o'rtada matn, o'ngda summa. to — havola, onClick — tugma
export function Row({ to, onClick, left, title, subtitle, right, className, chevron }) {
    const inner = (
        <>
            {left}
            <span className="min-w-0 flex-1 text-[15px] leading-snug">
                <span className="block truncate font-bold text-ink">{title}</span>
                {subtitle && <span className="block truncate text-[13px] text-ink-3">{subtitle}</span>}
            </span>
            {right && <span className="shrink-0 text-right">{right}</span>}
            {chevron && <ChevronRight size={20} className="shrink-0 text-ink-3" aria-hidden />}
        </>
    )
    const cls = cx('flex w-full items-center gap-3 px-3.5 py-3 text-left', (to || onClick) && 'transition-colors hover:bg-soft/60', className)
    if (to) return <Link to={to} className={cls}>{inner}</Link>
    if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>
    return <div className={cls}>{inner}</div>
}

// Qatorlar ro'yxati kartada, orasida chiziq
export function List({ children, className }) {
    return <Card className={cx('divide-y divide-line overflow-hidden', className)}>{children}</Card>
}

export function EmptyState({ icon: Icon, title, text, action, className }) {
    return (
        <div className={cx('flex flex-col items-center px-6 py-12 text-center', className)}>
            {Icon && (
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                    <Icon size={28} aria-hidden />
                </span>
            )}
            <p className="text-[17px] font-bold text-ink">{title}</p>
            {text && <p className="mt-1 max-w-sm text-[15px] text-ink-2">{text}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    )
}

export function ErrorState({ text = "Ma'lumotni yuklab bo'lmadi.", onRetry, className }) {
    return (
        <div role="alert" className={cx('flex flex-col items-center px-6 py-10 text-center', className)}>
            <p className="text-[15px] font-semibold text-ink">{text}</p>
            {onRetry && <Button variant="secondary" icon={RefreshCw} className="mt-4" onClick={onRetry}>Qayta urinish</Button>}
        </div>
    )
}

export function Skeleton({ className }) {
    return <div aria-hidden className={cx('animate-pulse rounded-xl bg-line/70', className)} />
}

export function ListSkeleton({ rows = 5 }) {
    return (
        <Card className="divide-y divide-line" aria-busy="true" aria-label="Yuklanmoqda">
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-3.5 py-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
                    <Skeleton className="h-4 w-16" />
                </div>
            ))}
        </Card>
    )
}

export function OfflineBanner() {
    return (
        <div role="status" className="flex items-center justify-center gap-2 bg-warn-soft px-4 py-2 text-sm font-semibold text-warn">
            <WifiOff size={16} aria-hidden /> Internet yo'q — oxirgi saqlangan ma'lumot ko'rsatilmoqda
        </div>
    )
}

// Oddiy jadval (kompyuter). columns: [{ key, label, align, render(row) }]
export function Table({ columns, rows, rowKey = 'id', onRowClick, empty, className }) {
    return (
        <div className={cx('card overflow-x-auto', className)}>
            <table className="w-full min-w-[640px] text-left text-[15px]">
                <thead>
                    <tr className="border-b border-line">
                        {columns.map((c) => (
                            <th key={c.key} scope="col" className={cx('px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-2', c.align === 'right' && 'text-right', c.className)}>
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-line">
                    {rows.map((row) => (
                        <tr
                            key={row[rowKey]}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                            className={cx(onRowClick && 'cursor-pointer hover:bg-soft/60')}
                        >
                            {columns.map((c) => (
                                <td key={c.key} className={cx('px-4 py-3 align-middle', c.align === 'right' && 'text-right', c.className)}>
                                    {c.render ? c.render(row) : row[c.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length === 0 && empty}
        </div>
    )
}
