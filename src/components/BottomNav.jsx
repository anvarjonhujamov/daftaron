import { NavLink } from 'react-router-dom'
import { Home, Users, BarChart3, Settings } from 'lucide-react'

export default function BottomNav() {
    const navItems = [
        { to: '/', icon: Home, label: 'Bosh sahifa' },
        { to: '/customers', icon: Users, label: 'Mijozlar' },
        { to: '/debts', icon: BarChart3, label: 'Xisobotlar' },
        { to: '/profile', icon: Settings, label: 'Sozlamalar' }
    ]

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
                                        <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-1.5 rounded-full mb-1">
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
