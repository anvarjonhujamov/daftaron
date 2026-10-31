import { Home, Users, AlarmClock, History, Package, BarChart3, UserCog, Store, CreditCard, Bell, Settings, Menu } from 'lucide-react'

// Bo'limlar: kompyuterda yon menyu (ikki guruh), telefonda pastki menyu + «Yana» sahifasi.
// perm — /settings huquqi (backend TZ 28.8); owner — faqat do'kon egasi
export const MAIN_NAV = [
    { to: '/', label: 'Asosiy', icon: Home, end: true },
    { to: '/customers', label: 'Mijozlar', icon: Users },
    { to: '/overdue', label: "Muddati o'tganlar", short: 'Muddati', icon: AlarmClock, badge: 'overdue' },
    { to: '/history', label: 'Tarix', icon: History, perm: 'reports.view' },
    { to: '/suppliers', label: "Ta'minotchilar", short: "Ta'minot", icon: Package },
    { to: '/reports', label: 'Hisobot', icon: BarChart3, perm: 'reports.view' }
]

export const SECOND_NAV = [
    { to: '/staff', label: 'Xodimlar', icon: UserCog, perm: 'staff.manage' },
    { to: '/shops', label: "Do'konlar", icon: Store, owner: true },
    { to: '/subscription', label: "Ta'rif va balans", short: "Ta'rif", icon: CreditCard, owner: true },
    { to: '/notifications', label: 'Bildirishnomalar', short: 'Xabarlar', icon: Bell, badge: 'unread' },
    { to: '/settings', label: 'Sozlamalar', icon: Settings }
]

export const visibleNav = (items, session) =>
    items.filter((i) => (!i.perm || session.can(i.perm)) && (!i.owner || session.isOwner))

// Telefon: 4 ta asosiy, qolgani «Yana» ichida
export const bottomNav = (session) => [
    MAIN_NAV[0],
    MAIN_NAV[1],
    session.can('reports.view') ? MAIN_NAV[5] : MAIN_NAV[2],
    { to: '/more', label: 'Yana', icon: Menu, badge: 'unread' }
]
