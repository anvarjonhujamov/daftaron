import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { authApi } from '../api/auth.api'
import { useSession } from '../app/session'
import { deviceName, getToken } from '../lib/session'
import { errorMessage } from '../lib/errors'
import { AuthShell, Logo } from './LoginPage'

// @daftaron_bot yuborgan bir martalik «Kirish» havolasi: ?phone=&ts=&sig= (bot imzosi, 10 daqiqa).
// Faqat imzo bilan kiriladi — yalang'och telefon raqami qabul qilinmaydi (backend TZ 23.1)
export default function TelegramLoginPage() {
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const session = useSession()
    const [error, setError] = useState('')

    useEffect(() => {
        const phone = params.get('phone')
        const ts = Number(params.get('ts'))
        const sig = params.get('sig')
        // Bot menyu tugmasi (Mini App) shu manzilni parametrsiz ochadi: kirish sahifasi init_data bilan kiritadi
        if (!phone || !ts || !sig) {
            navigate(getToken() ? '/' : '/login', { replace: true })
            return
        }
        // Havoladagi imzo brauzer tarixida qolmasin
        window.history.replaceState(null, '', '/telegram/web-login')
        authApi.telegramLogin({ phone, ts, sig, device_name: deviceName() })
            .then(async (res) => {
                await session.signIn(res.token, res.user)
                navigate(res.onboarding && !res.onboarding.completed && res.onboarding.step !== 'done' ? '/onboarding' : '/', { replace: true })
            })
            .catch((err) => setError(err?.response?.status === 401
                ? "Havola eskirgan yoki noto'g'ri. Botdan yangi havola oling."
                : errorMessage(err)))
    }, [])

    return (
        <AuthShell>
            <div className="mt-6"><Logo /></div>
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
                {error ? (
                    <>
                        <p role="alert" className="text-[17px] font-semibold">{error}</p>
                        <a href="https://t.me/daftaron_bot" className="font-semibold text-brand-strong">@daftaron_bot ni ochish</a>
                        <Link to="/login" className="font-semibold text-brand-strong">Raqam bilan kirish</Link>
                    </>
                ) : (
                    <p className="flex items-center gap-2 text-ink-2"><Loader2 className="animate-spin" aria-hidden /> Kirilmoqda…</p>
                )}
            </div>
        </AuthShell>
    )
}
