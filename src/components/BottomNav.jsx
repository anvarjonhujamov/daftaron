import { NavLink } from 'react-router-dom'
import { useSubscription } from '../contexts/SubscriptionContext'
import { FULL_NAV_ITEMS, BLOCKED_NAV_ITEMS } from './navItems'

// Faqat telefonda; planshet va kompyuterda yon menyu (Sidebar) ishlaydi
export default function BottomNav() {
    const { blocked } = useSubscription()
    const navItems = blocked ? BLOCKED_NAV_ITEMS : FULL_NAV_ITEMS

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center md:hidden" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
            <div className="bottom-bar">
                {navItems.map(item => {
                    const Icon = item.icon
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/'}
                            className={({ isActive }) =>
                                `bottom-bar-item ${isActive ? 'bottom-bar-item-active' : ''}`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={20} strokeWidth={isActive ? 2.2 : 1.5} />
                                    {isActive && (
                                        <span className="bottom-bar-label">{item.label}</span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    )
                })}
            </div>
        </nav>
    )
}
