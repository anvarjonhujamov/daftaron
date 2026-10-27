import { useMemo } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useSubscription } from '../contexts/SubscriptionContext'
import { isStaffFromUser } from '../utils/roleHelper'
import { FULL_NAV_ITEMS, BLOCKED_NAV_ITEMS, EXTRA_NAV_ITEMS } from './navItems'

const readStoredUser = () => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
}

// Planshet (md): ikonka + kichik yozuvli tor panel (shortLabel bo'lsa o'sha). Kompyuter (lg): to'liq yon menyu.
function SidebarLink({ item }) {
    const Icon = item.icon
    return (
        <NavLink
            to={item.to}
            end={item.to === '/'}
            title={item.label}
            className={({ isActive }) =>
                `group flex flex-col lg:flex-row items-center gap-1 lg:gap-3 rounded-2xl px-2 py-2.5 lg:px-3 transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                }`
            }
        >
            {({ isActive }) => (
                <>
                    <Icon size={22} strokeWidth={isActive ? 2.2 : 1.7} className="shrink-0" />
                    <span className={`text-[11px] lg:text-[14px] leading-tight text-center lg:text-left truncate max-w-full ${isActive ? 'font-semibold' : 'font-medium'}`}>
                        <span className="lg:hidden">{item.shortLabel || item.label}</span>
                        <span className="hidden lg:inline">{item.label}</span>
                    </span>
                </>
            )}
        </NavLink>
    )
}

export default function Sidebar() {
    const { blocked } = useSubscription()
    const location = useLocation()
    // Do'kon almashtirilganda user localStorage'da yangilanadi: har navigatsiyada qayta o'qiymiz
    const user = useMemo(readStoredUser, [location.pathname])
    const isStaff = isStaffFromUser(user) === true
    const shopName = user?.tenant_name || user?.shop_name || user?.tenant?.name

    const mainItems = blocked ? BLOCKED_NAV_ITEMS : FULL_NAV_ITEMS
    const extraItems = blocked ? [] : EXTRA_NAV_ITEMS.filter((item) => !(item.ownerOnly && isStaff))

    return (
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-24 lg:w-64 flex-col border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
            {/* Brend */}
            <div className="flex items-center justify-center lg:justify-start gap-3 h-[72px] px-3 lg:px-5 shrink-0">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                    <img src="/logo.png" alt="Daftaron" className="w-7 h-7 object-contain" />
                </div>
                <span className="hidden lg:block text-[18px] font-bold text-gray-900 dark:text-white">Daftaron</span>
            </div>

            {/* Faol do'kon (faqat kompyuterda) */}
            {shopName && (
                isStaff || blocked ? (
                    <div className="hidden lg:block mx-3 mb-3 px-3 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Do'kon</p>
                        <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">{shopName}</p>
                    </div>
                ) : (
                    <Link
                        to="/shops"
                        state={{ from: location.pathname }}
                        className="hidden lg:flex items-center gap-2 mx-3 mb-3 px-3 py-2.5 rounded-2xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700/70 transition-colors"
                        title="Do'konni o'zgartirish"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Do'kon</p>
                            <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate">{shopName}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-400 shrink-0" />
                    </Link>
                )
            )}

            <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 lg:px-3 pb-4 space-y-1">
                {mainItems.map((item) => <SidebarLink key={item.to} item={item} />)}

                {extraItems.length > 0 && (
                    <>
                        <div className="my-3 mx-2 border-t border-gray-100 dark:border-gray-800" />
                        {extraItems.map((item) => <SidebarLink key={item.to} item={item} />)}
                    </>
                )}
            </nav>

            <p className="hidden lg:block px-5 py-4 text-[11px] text-gray-400 shrink-0">Versiya {__APP_VERSION__}</p>
        </aside>
    )
}
