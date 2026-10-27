import { Home, Users, FileText, History, Settings, Package, Bell, UserCog, Store } from 'lucide-react'

// Asosiy bo'limlar: telefonda pastki menyu, planshet/kompyuterda yon menyu
export const FULL_NAV_ITEMS = [
    { to: '/', icon: Home, label: 'Asosiy' },
    { to: '/customers', icon: Users, label: 'Mijozlar' },
    { to: '/debts', icon: FileText, label: 'Hisobot' },
    { to: '/suppliers', icon: Package, label: "Ta'minotchi" },
    { to: '/payments', icon: History, label: 'Tarix' },
    { to: '/profile', icon: Settings, label: 'Sozlama' }
]

// Obuna tugaganda faqat shu sahifalar ochiladi (PrivateRoute bilan mos)
export const BLOCKED_NAV_ITEMS = [
    { to: '/subscription', icon: FileText, label: "Ta'rif" },
    { to: '/profile', icon: Settings, label: 'Sozlama' }
]

// Yon menyudagi qo'shimcha bo'limlar (telefonda ular Dashboard sarlavhasida)
export const EXTRA_NAV_ITEMS = [
    { to: '/notifications', icon: Bell, label: 'Bildirishnomalar', shortLabel: 'Xabarlar' },
    { to: '/staff', icon: UserCog, label: 'Xodimlar', ownerOnly: true },
    { to: '/shops', icon: Store, label: "Do'konlar", ownerOnly: true }
]
