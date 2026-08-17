import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import ScrollToTop from './components/ScrollToTop'
import { initTelegramWebApp } from './utils/telegram'
import { Toaster } from 'react-hot-toast'
import { SubscriptionProvider } from './contexts/SubscriptionContext'

// Auth pages
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import TermsPage from './pages/TermsPage'
import DeleteAccountPage from './pages/DeleteAccountPage'

// App pages
import DashboardPage from './pages/DashboardPage'
import CustomersPage from './pages/CustomersPage'
import CustomerDetailPage from './pages/CustomerDetailPage'
import CustomerFormPage from './pages/CustomerFormPage'
import DebtsPage from './pages/DebtsPage'
import DebtDetailPage from './pages/DebtDetailPage'
import HistoryPage from './pages/HistoryPage'
import ProfilePage from './pages/ProfilePage'
import SubscriptionPage from './pages/SubscriptionPage'
import OverduePage from './pages/OverduePage'
import NotificationsPage from './pages/NotificationsPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import LegalManagementPage from './pages/LegalManagementPage'
import ShopsPage from './pages/ShopsPage'
import StaffPage from './pages/StaffPage'
import SupportPage from './pages/SupportPage'

export default function App() {

    useEffect(() => {
        initTelegramWebApp()
    }, [])

    return (
        <SubscriptionProvider>
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 4000,
                    style: {
                        borderRadius: '16px',
                        background: '#333',
                        color: '#fff',
                        fontSize: '14px'
                    },
                }}
            />
            <ScrollToTop />
            <Routes>
                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/delete-account" element={<DeleteAccountPage />} />

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
                    <Route path="/customers/new" element={<CustomerFormPage />} />
                    <Route path="/customers/:id/edit" element={<CustomerFormPage />} />
                    <Route path="/customers/:id" element={<CustomerDetailPage />} />
                    <Route path="/debts" element={<DebtsPage />} />
                    <Route path="/debts/:id" element={<DebtDetailPage />} />
                    <Route path="/payments" element={<HistoryPage />} />
                    <Route path="/overdue" element={<Navigate to="/customers?filter=overdue" replace />} />
                    <Route path="/notifications" element={<NotificationsPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/subscription" element={<SubscriptionPage />} />
                    <Route path="/shops" element={<ShopsPage />} />
                    <Route path="/staff" element={<StaffPage />} />
                    <Route path="/support" element={<SupportPage />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                    <Route path="/admin/legal" element={<LegalManagementPage />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </SubscriptionProvider>
    )
}
