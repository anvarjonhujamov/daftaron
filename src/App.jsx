import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import ScrollToTop from './components/ScrollToTop'
import { initTelegramWebApp } from './utils/telegram'

// Auth pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// App pages
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import DebtsPage from './pages/DebtsPage'
import DebtDetailPage from './pages/DebtDetailPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import SubscriptionPage from './pages/SubscriptionPage'

export default function App() {

    useEffect(() => {
        // Agar ilova Telegram WebApp ichida ochilgan bo'lsa — tayyorlab olamiz
        initTelegramWebApp()
    }, [])

    return (
        <>
            <ScrollToTop />
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected routes */}
                <Route
                    element={
                        <PrivateRoute>
                            <Layout />
                        </PrivateRoute>
                    }
                >
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/customers/new" element={<Navigate to="/customers" replace />} />
                    <Route path="/customers/:id" element={<CustomerDetailPage />} />
                    <Route path="/debts" element={<DebtsPage />} />
                    <Route path="/debts/:id" element={<DebtDetailPage />} />
                    <Route path="/payments" element={<HistoryPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/subscription" element={<SubscriptionPage />} />
                </Route>
            </Routes>
        </>
    )
}
