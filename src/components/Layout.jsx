import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

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
                <Outlet />
            </main>
            <BottomNav />
        </div>
    )
}
