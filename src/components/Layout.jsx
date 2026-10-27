import { useEffect, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'
import LoadingSpinner from './LoadingSpinner'
import toast from 'react-hot-toast'
import { migrateLegacySupplierRecords } from '../api/suppliers.api'

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

    // Eski versiyada faqat telefonda qolgan ta'minotchi xarid/to'lovlarini bir marta serverga yuboramiz
    useEffect(() => {
        migrateLegacySupplierRecords()
            .then(({ synced, failed }) => {
                if (synced) toast.success(`${synced} ta ta'minotchi yozuvi serverga yuborildi`)
                if (failed) toast.error(`${failed} ta ta'minotchi yozuvi yuborilmadi. Ta'minotchi sahifasida ko'ring`, { duration: 8000 })
            })
            .catch((err) => console.error('Supplier migration failed:', err))
    }, [])

    // Telefonda pastki menyu, planshet/kompyuterda yon menyu (md:pl-24 / lg:pl-64 uning kengligi)
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors md:pl-24 lg:pl-64">
            <Sidebar />
            <main className="pb-24 md:pb-8 app-container">
                {/* Lazy sahifa yuklanayotganda pastki menyu joyida qoladi */}
                <Suspense fallback={<div className="flex justify-center pt-24"><LoadingSpinner /></div>}>
                    <Outlet />
                </Suspense>
            </main>
            <BottomNav />
        </div>
    )
}
