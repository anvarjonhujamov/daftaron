import { NavLink } from 'react-router-dom'
import { Home, Users, BarChart3, Settings, History, Package } from 'lucide-react'
import { useSubscription } from '../contexts/SubscriptionContext'

const FULL_NAV_ITEMS = [
    { to: '/', icon: Home, label: 'Bosh sahifa' },
    { to: '/customers', icon: Users, label: 'Mijozlar' },
    { to: '/payments', icon: History, label: 'Tarix' },
    { to: '/debts', icon: BarChart3, label: 'Hisobotlar' },
    { to: '/profile', icon: Settings, label: 'Sozlamalar' }
]

const BLOCKED_NAV_ITEMS = [
    { to: '/subscription', icon: Package, label: "Ta'rif" },
    { to: '/profile', icon: Settings, label: 'Sozlamalar' }
]

export default function BottomNav() {
    const { blocked } = useSubscription()
    const navItems = blocked ? BLOCKED_NAV_ITEMS : FULL_NAV_ITEMS

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 pb-safe z-50 transition-colors">
            <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
                {navItems.map(item => {
                    const Icon = item.icon
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `
                flex flex-col items-center justify-center flex-1 py-2 transition-all
                ${isActive
                                    ? 'text-blue-500'
                                    : 'text-gray-400 dark:text-gray-500'
                                }
              `}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive ? (
                                        <div className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-full mb-1">
                                            <Icon size={20} strokeWidth={2} />
                                        </div>
                                    ) : (
                                        <Icon size={22} strokeWidth={1.5} className="mb-1" />
                                    )}
                                    <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}
