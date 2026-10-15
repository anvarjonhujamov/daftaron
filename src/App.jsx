import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import PrivateRoute from './components/PrivateRoute'
import ScrollToTop from './components/ScrollToTop'
import { initTelegramWebApp } from './utils/telegram'
import { Toaster } from 'react-hot-toast'
import { SubscriptionProvider } from './contexts/SubscriptionContext'
import { LoginSkeleton } from './components/Skeleton'

// Login va Dashboard asosiy bundle'da, qolgan sahifalar kerak bo'lganda yuklanadi
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

// Yangi deploydan keyin eski chunk topilmasa sahifani bir marta yangilaymiz
const lazyPage = (factory) => lazy(() => factory().catch((err) => {
    if (!sessionStorage.getItem('chunk_reload')) {
        sessionStorage.setItem('chunk_reload', '1')
        window.location.reload()
        return new Promise(() => {})
    }
    throw err
}))

// Auth pages
const RegisterPage = lazyPage(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazyPage(() => import('./pages/ForgotPasswordPage'))
const TermsPage = lazyPage(() => import('./pages/TermsPage'))
const DeleteAccountPage = lazyPage(() => import('./pages/DeleteAccountPage'))

// App pages
const CustomersPage = lazyPage(() => import('./pages/CustomersPage'))
const CustomerDetailPage = lazyPage(() => import('./pages/CustomerDetailPage'))
const CustomerFormPage = lazyPage(() => import('./pages/CustomerFormPage'))
const DebtsPage = lazyPage(() => import('./pages/DebtsPage'))
const DebtDetailPage = lazyPage(() => import('./pages/DebtDetailPage'))
const HistoryPage = lazyPage(() => import('./pages/HistoryPage'))
const ProfilePage = lazyPage(() => import('./pages/ProfilePage'))
const SubscriptionPage = lazyPage(() => import('./pages/SubscriptionPage'))
const OverduePage = lazyPage(() => import('./pages/OverduePage'))
const NotificationsPage = lazyPage(() => import('./pages/NotificationsPage'))
const PrivacyPolicyPage = lazyPage(() => import('./pages/PrivacyPolicyPage'))
const LegalManagementPage = lazyPage(() => import('./pages/LegalManagementPage'))
const ShopsPage = lazyPage(() => import('./pages/ShopsPage'))
const StaffPage = lazyPage(() => import('./pages/StaffPage'))
const SuppliersPage = lazyPage(() => import('./pages/SuppliersPage'))
const SupplierDetailPage = lazyPage(() => import('./pages/SupplierDetailPage'))
const SupportPage = lazyPage(() => import('./pages/SupportPage'))

export default function App() {

    useEffect(() => {
        // SDK async yuklanadi: hali tayyor bo'lmasa, yuklangach ishga tushiramiz
        if (initTelegramWebApp()) return
        window.addEventListener('telegram-sdk-loaded', initTelegramWebApp, { once: true })
        return () => window.removeEventListener('telegram-sdk-loaded', initTelegramWebApp)
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
            <Suspense fallback={<LoginSkeleton />}>
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
                        <Route path="/suppliers" element={<SuppliersPage />} />
                        <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
                        <Route path="/support" element={<SupportPage />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                        <Route path="/admin/legal" element={<LegalManagementPage />} />
                    </Route>

                    {/* 404 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
        </SubscriptionProvider>
    )
}
