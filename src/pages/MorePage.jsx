import { Bell, BookOpen, Bot, CreditCard, History, Moon, Package, Settings, Store, UserCog, AlarmClock, BarChart3 } from 'lucide-react'
import { applyTheme, useSession } from '../app/session'
import { profileApi } from '../api/settings.api'
import { useState } from 'react'
import { Avatar, CountBadge, List, PageHeader, Row } from '../ui/display'
import { Toggle } from '../ui/controls'
import { formatNumber, planLabel } from '../utils/format'
import { t } from '../i18n'

// Telefon: pastki menyuga sig'magan barcha bo'limlar
export default function MorePage() {
    const session = useSession()
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))
    const sub = session.subscription
    const days = sub?.trial_info?.days_remaining
    const role = session.isOwner ? t('Egasi') : t('Xodim')
    const items = [
        ['/overdue', AlarmClock, t("Muddati o'tganlar")],
        session.can('reports.view') && ['/reports', BarChart3, t('Hisobot')],
        ['/suppliers', Package, t("Ta'minotchilar")],
        session.can('reports.view') && ['/history', History, t('Tarix'), t('Barcha amallar')],
        session.can('staff.manage') && ['/staff', UserCog, t('Xodimlar')],
        ['/shops', Store, t("Do'konlar"), session.ownsShop === false ? t("O'z do'konimni ochish") : t("{n} ta do'kon", { n: (session.tenants || []).length })],
        ['/notifications', Bell, t('Bildirishnomalar'), null, <CountBadge key="b" count={session.unread} />],
        ['/support', Bot, t('Yordam va AI yordamchi')],
        ['/guides', BookOpen, t("Foydalanish qo'llanmasi")],
        ['/subscription', CreditCard, t("Ta'rif va balans"), sub && `${planLabel(sub.usage)} · ${days !== undefined ? t('{n} kun qoldi', { n: days }) : ''} · SMS ${formatNumber(sub.usage?.sms_remaining)}`],
        ['/settings', Settings, t('Sozlamalar')]
    ].filter(Boolean)

    return (
        <div className="page md:max-w-2xl">
            <PageHeader title={t('Yana')} />
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
                }} label={<span className="flex items-center gap-2"><Moon size={18} aria-hidden />{t('Tungi rejim')}</span>} />
            </div>
        </div>
    )
}
