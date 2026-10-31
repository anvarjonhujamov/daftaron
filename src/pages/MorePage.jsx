import { Bell, Bot, CreditCard, History, Moon, Package, Settings, Store, UserCog, AlarmClock, BarChart3 } from 'lucide-react'
import { applyTheme, useSession } from '../app/session'
import { profileApi } from '../api/settings.api'
import { useState } from 'react'
import { Avatar, CountBadge, List, PageHeader, Row } from '../ui/display'
import { Toggle } from '../ui/controls'
import { formatNumber } from '../utils/format'

// Telefon: pastki menyuga sig'magan barcha bo'limlar
export default function MorePage() {
    const session = useSession()
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
    const sub = session.subscription
    const days = sub?.trial_info?.days_remaining
    const role = session.isOwner ? 'Egasi' : 'Xodim'
    const items = [
        ['/overdue', AlarmClock, "Muddati o'tganlar"],
        session.can('reports.view') && ['/reports', BarChart3, 'Hisobot'],
        ['/suppliers', Package, "Ta'minotchilar"],
        session.can('reports.view') && ['/history', History, 'Tarix', 'Barcha amallar'],
        session.can('staff.manage') && ['/staff', UserCog, 'Xodimlar'],
        session.isOwner && ['/shops', Store, "Do'konlar", `${(session.tenants || []).length} ta do'kon`],
        ['/notifications', Bell, 'Bildirishnomalar', null, <CountBadge key="b" count={session.unread} />],
        ['/support', Bot, 'Yordam va AI yordamchi'],
        ['/subscription', CreditCard, "Ta'rif va balans", sub && `${sub.usage?.plan_name || 'Sinov'} · ${days !== undefined ? `${days} kun qoldi` : ''} · SMS ${formatNumber(sub.usage?.sms_remaining)}`],
        ['/settings', Settings, 'Sozlamalar']
    ].filter(Boolean)

    return (
        <div className="page md:max-w-2xl">
            <PageHeader title="Yana" />
            <List>
                <Row to="/settings/profile" left={<Avatar name={session.user?.name} size={44} />} title={session.user?.name} subtitle={`${role} · ${session.tenant?.name || ''}`} chevron />
            </List>
            <List className="mt-4">
                {items.map(([to, Icon, title, subtitle, right]) => (
                    <Row key={to} to={to} left={<Icon size={20} className="text-ink-2" aria-hidden />} title={title} subtitle={subtitle} right={right} chevron />
                ))}
            </List>
            <div className="card mt-4 px-3.5 py-3">
                <Toggle checked={dark} onChange={(v) => {
                    setDark(v)
                    applyTheme(v ? 'dark' : 'light')
                    profileApi.update({ name: session.user?.name, theme: v ? 'dark' : 'light' }).catch(() => {})
                }} label={<span className="flex items-center gap-2"><Moon size={18} aria-hidden />Tungi rejim</span>} />
            </div>
        </div>
    )
}
