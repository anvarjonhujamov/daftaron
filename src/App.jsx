import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import ScrollToTop from './components/ScrollToTop'
import { initTelegramWebApp } from './utils/telegram'

// Auth pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'

// App pages
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import DebtsPage from './pages/DebtsPage'
import DebtDetailPage from './pages/DebtDetailPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import SubscriptionPage from './pages/SubscriptionPage'
import OverduePage from './pages/OverduePage'
import NotificationsPage from './pages/NotificationsPage'

export default function App() {

    useEffect(() => {
        initTelegramWebApp()
    }, [])

    return (
        <>
            <ScrollToTop />
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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
                    <Route path="/overdue" element={<OverduePage />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/subscription" element={<SubscriptionPage />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    )
}
