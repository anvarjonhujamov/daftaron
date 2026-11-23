import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { authApi } from '../api/auth.api'
import { settingsApi } from '../api/settings.api'
import { subscriptionApi } from '../api/subscription.api'
import { notificationsApi } from '../api/reports.api'
import { TRIAL_EXPIRED_EVENT } from '../api/client'
import { clearDataCache, readCache, writeCache } from '../lib/cache'
import { clearLocalData, getToken, getUser, setSession, setUser } from '../lib/session'

// Kirgan foydalanuvchi holati: /auth/me + /settings (huquqlar, eslatmalar) + /subscription/status.
// Oxirgi javob keshda — sahifa API'ni kutmasdan chiziladi.
const SessionContext = createContext(null)
const CACHE_KEY = 'session_v2'

export const applyTheme = (theme) => {
    const dark = theme === 'dark'
    document.documentElement.classList.toggle('dark', dark)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B1220' : '#2563EB')
    try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch { /* ignore */ }
}

// Bepul sinov tugagan: oldingi ro'yxatlar keshdan ham ko'rinmasin (sessiya va obuna holati qoladi)
const withLockedCache = (subscription) => {
    if (subscription?.trial_expired) clearDataCache([CACHE_KEY, 'subscription_status'])
    return subscription
}

export function SessionProvider({ children }) {
    const [state, setState] = useState(() => readCache(CACHE_KEY) || {})
    const [loading, setLoading] = useState(() => !!getToken() && !readCache(CACHE_KEY))
    const [unread, setUnread] = useState(0)

    const refresh = useCallback(async () => {
        if (!getToken()) return
        const [me, settings, subscription] = await Promise.allSettled([
            authApi.me(), settingsApi.get(), subscriptionApi.status()
        ])
        if (me.status === 'rejected' && me.reason?.response?.status === 401) return
        setState((prev) => {
            const next = { ...prev }
            if (me.status === 'fulfilled') {
                next.user = me.value.user
                next.tenant = me.value.active_tenant || null
                next.tenants = me.value.available_tenants || []
                setUser(me.value.user)
            }
            if (settings.status === 'fulfilled') {
                next.settings = settings.value
                if (settings.value?.profile?.theme && !prev.settings) applyTheme(settings.value.profile.theme)
            }
            if (subscription.status === 'fulfilled') next.subscription = withLockedCache(subscription.value)
            writeCache(CACHE_KEY, next)
            return next
        })
        setLoading(false)
    }, [])

    // Biror so'rov 403 trial_expired qaytardi (sinov shu orada tugagan): faqat obuna holati qayta o'qiladi —
    // u 403 bermaydi, shuning uchun aylanib qolmaydi. Bir vaqtda kelgan bir nechta 403 — bitta so'rov
    const lastLockCheck = useRef(0)
    const refreshSubscription = useCallback(() => {
        if (!getToken() || Date.now() - lastLockCheck.current < 5000) return
        lastLockCheck.current = Date.now()
        subscriptionApi.status().then((value) => setState((prev) => {
            const next = { ...prev, subscription: withLockedCache(value) }
            writeCache(CACHE_KEY, next)
            return next
        })).catch(() => {})
    }, [])

    const locked = useRef(false)
    locked.current = !!state.subscription?.trial_expired

    const refreshUnread = useCallback(() => {
        if (!getToken() || locked.current) return
        notificationsApi.unreadCount().then((r) => setUnread(r?.count || 0)).catch(() => {})
    }, [])

    // Kirish: oldingi foydalanuvchi keshlari tozalanadi, keyin yangi sessiya yuklanadi
    const signIn = useCallback(async (token, user) => {
        setSession(token, user)
        setState({ user })
        setLoading(true)
        await refresh()
        setLoading(false)
        refreshUnread()
    }, [refresh, refreshUnread])

    useEffect(() => {
        refresh().finally(() => setLoading(false))
        refreshUnread()
        const onVisible = () => document.visibilityState === 'visible' && refreshUnread()
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener(TRIAL_EXPIRED_EVENT, refreshSubscription)
        const timer = setInterval(refreshUnread, 120000)
        return () => {
            document.removeEventListener('visibilitychange', onVisible)
            window.removeEventListener(TRIAL_EXPIRED_EVENT, refreshSubscription)
            clearInterval(timer)
        }
    }, [refresh, refreshUnread, refreshSubscription])

    const value = useMemo(() => {
        const user = state.user || getUser()
        // /auth/me → active_tenant bo'sh kelishi mumkin (backend select'ida id yo'q edi): /settings → shop zaxira
        const tenant = state.tenant || (state.settings?.shop ? { id: state.settings.shop.id, name: state.settings.shop.name } : null)
        const permissions = state.settings?.permissions || (state.settings ? [] : null)
        const sub = state.subscription
        const trial = sub?.trial_info || {}
        return {
            ...state,
            user,
            tenant,
            loading,
            unread,
            setUnread,
            refresh,
            refreshUnread,
            signIn,
            // Hali yuklanmagan bo'lsa (null) — tugmalar ko'rinadi, backend baribir tekshiradi (403)
            can: (perm) => (permissions === null ? true : permissions.includes(perm)),
            isOwner: permissions === null ? true : permissions.includes('staff.manage'),
            // Ikki rolli hisob (TZ 28.21): o'z do'koni bormi — available_tenants → owner_id. Hali yuklanmagan — null
            ownsShop: state.tenants ? state.tenants.some((t) => Number(t.owner_id) === Number(user?.id)) : null,
            readOnly: !!(trial.is_expired || sub?.read_only || sub?.usage?.subscription_status === 'expired'),
            // Bepul sinov tugagan, ta'rif olinmagan: ma'lumotlar yopiq — faqat «Ta'rif va balans» sahifasi (Layout)
            trialExpired: !!sub?.trial_expired,
            // Excel eksport ta'rifga bog'liq (Oddiy'da yo'q); ma'lumot kelmagan bo'lsa backend tekshiradi (403)
            canExport: sub?.usage?.export_allowed !== false,
            notifications: state.settings?.notifications || {},
            updateSettings: (patch) => setState((s) => {
                const next = { ...s, settings: { ...s.settings, ...patch } }
                writeCache(CACHE_KEY, next)
                return next
            })
        }
    }, [state, loading, unread, refresh, refreshUnread, signIn])

    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export const useSession = () => useContext(SessionContext)

export const logout = async () => {
    try { await authApi.logout() } catch { /* token baribir o'chiriladi */ }
    clearLocalData()
    window.location.replace('/login')
}
