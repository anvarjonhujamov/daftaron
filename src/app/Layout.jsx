import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChevronsUpDown, Loader2, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSession } from './session'
import { MAIN_NAV, SECOND_NAV, bottomNav, visibleNav } from './nav'
import { ActionsProvider, useActions } from './actions'
import LegalAcceptSheet from './LegalAcceptSheet'
import { CountBadge, OfflineBanner } from '../ui/display'
import { cx } from '../ui/controls'
import { useOnChange, useOnline } from '../lib/hooks'
import { overdueApi } from '../api/debts.api'
import { migrateLegacySupplierRecords } from '../api/suppliers.api'
import { formatDate } from '../utils/date'
import { formatNumber } from '../utils/format'

function useBadges(session) {
    const [overdue, setOverdue] = useState(0)
    const load = () => overdueApi.list().then((r) => setOverdue(r?.summary?.count || 0)).catch(() => {})
    useEffect(() => { load() }, [session.user?.tenant_id])
    useOnChange(load)
    return { overdue, unread: session.unread }
}

function SideLink({ item, badges }) {
    const count = item.badge ? badges[item.badge] : 0
    return (
        <NavLink
            to={item.to}
            end={item.end}
            title={item.label}
            className={({ isActive }) => cx(
                'relative flex items-center gap-3 rounded-[10px] transition-colors',
                'h-14 flex-col justify-center gap-0.5 px-1 lg:h-[42px] lg:flex-row lg:justify-start lg:px-3',
                isActive ? 'bg-brand-soft font-bold text-brand-strong' : 'font-semibold text-ink-2 hover:bg-soft hover:text-ink'
            )}
        >
            <item.icon size={20} className="shrink-0" aria-hidden />
            <span className="max-w-full truncate text-[11px] lg:flex-1 lg:text-[15px]">
                <span className="lg:hidden">{item.short || item.label}</span>
                <span className="hidden lg:inline">{item.label}</span>
            </span>
            {count > 0 && <CountBadge count={count} className="absolute right-1 top-1 lg:static" />}
        </NavLink>
    )
}

function Sidebar({ session, badges }) {
    const sub = session.subscription
    const usage = sub?.usage || {}
    const trial = sub?.trial_info || {}
    return (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col border-r border-line bg-card px-2 py-4 md:flex lg:w-[248px] lg:px-3.5 lg:py-5">
            <Link to="/" className="mb-4 flex items-center justify-center gap-2.5 lg:justify-start lg:px-2">
                <img src="/logo.png" alt="DaftarOn" className="h-9 w-9 object-contain" />
                <span className="hidden text-lg font-extrabold lg:inline">DaftarOn</span>
            </Link>
            <Link
                to={session.isOwner ? '/shops' : '/settings'}
                className="mb-3 hidden h-[52px] items-center justify-between rounded-xl border-[1.5px] border-line bg-soft/60 px-3 lg:flex"
            >
                <span className="min-w-0 leading-tight">
                    <span className="block text-[11px] font-bold tracking-wide text-ink-2">DO'KON</span>
                    <strong className="block truncate text-sm">{session.tenant?.name || '—'}</strong>
                </span>
                <ChevronsUpDown size={16} className="shrink-0 text-ink-2" aria-hidden />
            </Link>
            <nav aria-label="Asosiy bo'limlar" className="flex flex-col gap-0.5">
                {visibleNav(MAIN_NAV, session).map((i) => <SideLink key={i.to} item={i} badges={badges} />)}
            </nav>
            <div className="mx-2 my-2.5 h-px bg-line" />
            <nav aria-label="Boshqaruv" className="flex flex-col gap-0.5">
                {visibleNav(SECOND_NAV, session).map((i) => <SideLink key={i.to} item={i} badges={badges} />)}
            </nav>
            <div className="flex-1" />
            {sub && (
                <Link to="/subscription" className="hidden rounded-xl bg-soft/70 p-3 text-[13px] leading-relaxed text-ink-2 lg:block">
                    Obuna: <strong className="text-ink">{usage.plan_name || 'Sinov'} · {formatDate(trial.trial_ends_at)} gacha</strong>
                    <br />SMS: <strong className="text-ink">{formatNumber(usage.sms_remaining)} ta</strong> · Balans: <strong className="text-ink">{formatNumber(sub.balance)}</strong>
                </Link>
            )}
            <span className="hidden px-2 pt-2.5 text-xs text-ink-3 lg:block">Versiya {__APP_VERSION__.split('+')[0]}</span>
        </aside>
    )
}

function BottomNav({ session, badges }) {
    return (
        <nav aria-label="Asosiy bo'limlar" className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-card px-2 pt-1.5 md:hidden">
            {bottomNav(session).map((item) => {
                const count = item.badge ? badges[item.badge] : 0
                return (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => cx(
                            'relative flex flex-col items-center gap-1 py-1.5 text-xs',
                            isActive ? 'font-bold text-brand-strong' : 'font-semibold text-ink-2'
                        )}
                    >
                        <item.icon size={24} aria-hidden />
                        {item.label}
                        {count > 0 && <CountBadge count={count} className="absolute left-1/2 top-0 ml-2" />}
                    </NavLink>
                )
            })}
        </nav>
    )
}

// Kompyuter: N — nasiya, T — to'lov, M — yangi mijoz, / yoki Ctrl+K — qidiruv (input ichida yozilayotganda ishlamaydi)
function Shortcuts() {
    const actions = useActions()
    const navigate = useNavigate()
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                const search = document.querySelector('[data-search]')
                if (search) search.focus()
                else navigate('/customers')
                return
            }
            if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
            const t = e.target
            if (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || document.querySelector('dialog[open]')) return
            const key = e.key.toLowerCase()
            if (key === 'n') { e.preventDefault(); actions.openDebt() }
            else if (key === 't') { e.preventDefault(); actions.openPayment() }
            else if (key === 'm') { e.preventDefault(); navigate('/customers/new') }
            else if (key === '/') {
                const search = document.querySelector('[data-search]')
                if (search) { e.preventDefault(); search.focus() } else navigate('/customers')
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [actions, navigate])
    return null
}

export default function Layout() {
    const session = useSession()
    const online = useOnline()
    const badges = useBadges(session)
    const { pathname } = useLocation()

    useEffect(() => {
        migrateLegacySupplierRecords()
            .then(({ synced, failed }) => {
                if (synced) toast.success(`${synced} ta ta'minotchi yozuvi serverga yuborildi`)
                if (failed) toast.error(`${failed} ta ta'minotchi yozuvi yuborilmadi. Ta'minotchilar sahifasida ko'ring`, { duration: 8000 })
            })
            .catch(() => {})
    }, [])

    useEffect(() => { session.refreshUnread() }, [pathname])

    return (
        <ActionsProvider>
            <div className="min-h-screen md:pl-24 lg:pl-[248px]">
                <Sidebar session={session} badges={badges} />
                {!online && <OfflineBanner />}
                {session.readOnly && pathname !== '/subscription' && (
                    <Link to="/subscription" className="flex items-center justify-center gap-2 bg-debt-soft px-4 py-2 text-center text-sm font-semibold text-debt">
                        <Lock size={16} aria-hidden /> Obuna tugagan — faqat ko'rish mumkin. Uzaytirish
                    </Link>
                )}
                <main>
                    <Suspense fallback={<div className="flex justify-center pt-24"><Loader2 className="animate-spin text-ink-3" aria-label="Yuklanmoqda" /></div>}>
                        <Outlet />
                    </Suspense>
                </main>
                <BottomNav session={session} badges={badges} />
                <Shortcuts />
                <LegalAcceptSheet />
            </div>
        </ActionsProvider>
    )
}
