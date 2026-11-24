import { Home, Users, AlarmClock, History, Package, BarChart3, UserCog, Store, CreditCard, Bell, Settings, Menu, BookOpen } from 'lucide-react'
import { tk } from '../i18n'

// Bo'limlar: kompyuterda yon menyu (ikki guruh), telefonda pastki menyu + «Yana» sahifasi.
// perm — /settings huquqi (backend TZ 28.8); owner — faqat do'kon egasi. Nomlar ko'rsatishda t() bilan
export const MAIN_NAV = [
    { to: '/', label: tk('Asosiy'), icon: Home, end: true },
    { to: '/customers', label: tk('Mijozlar'), icon: Users },
    { to: '/overdue', label: tk("Muddati o'tganlar"), short: tk('Muddati'), icon: AlarmClock, badge: 'overdue' },
    { to: '/history', label: tk('Tarix'), icon: History, perm: 'reports.view' },
    { to: '/suppliers', label: tk("Ta'minotchilar"), short: tk("Ta'minot"), icon: Package },
    { to: '/reports', label: tk('Hisobot'), icon: BarChart3, perm: 'reports.view' }
]

export const SECOND_NAV = [
    { to: '/staff', label: tk('Xodimlar'), icon: UserCog, perm: 'staff.manage' },
    { to: '/shops', label: tk("Do'konlar"), icon: Store, owner: true },
    { to: '/subscription', label: tk("Ta'rif va balans"), short: tk("Ta'rif"), icon: CreditCard, owner: true },
    { to: '/notifications', label: tk('Bildirishnomalar'), short: tk('Xabarlar'), icon: Bell, badge: 'unread' },
    { to: '/guides', label: tk("Foydalanish qo'llanmasi"), short: tk("Qo'llanma"), icon: BookOpen },
    { to: '/settings', label: tk('Sozlamalar'), icon: Settings }
]

export const visibleNav = (items, session) =>
    items.filter((i) => (!i.perm || session.can(i.perm)) && (!i.owner || session.isOwner))

// Telefon: 4 ta asosiy, qolgani «Yana» ichida
export const bottomNav = (session) => [
    MAIN_NAV[0],
    MAIN_NAV[1],
    session.can('reports.view') ? MAIN_NAV[5] : MAIN_NAV[2],
    { to: '/more', label: tk('Yana'), icon: Menu, badge: 'unread' }
]
