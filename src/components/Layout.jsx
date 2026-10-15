import { useEffect, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import LoadingSpinner from './LoadingSpinner'

export default function Layout() {
    useEffect(() => {
        // Initialize dark mode on app load
        const savedDarkMode = localStorage.getItem('darkMode') === 'true'
        if (savedDarkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [])

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
            <main className="pb-24 max-w-lg mx-auto">
                {/* Lazy sahifa yuklanayotganda pastki menyu joyida qoladi */}
                <Suspense fallback={<div className="flex justify-center pt-24"><LoadingSpinner /></div>}>
                    <Outlet />
                </Suspense>
            </main>
            <BottomNav />
        </div>
    )
}
