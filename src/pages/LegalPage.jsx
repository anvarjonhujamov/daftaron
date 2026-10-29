import { useParams } from 'react-router-dom'
import { settingsApi } from '../api/settings.api'
import { useResource } from '../lib/hooks'
import { sanitizeHtml } from '../lib/sanitize'
import { ErrorState, Skeleton } from '../ui/display'
import { AuthShell } from './LoginPage'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../lib/session'

const TITLES = { offer: 'Ommaviy oferta', privacy: 'Maxfiylik siyosati' }

// Hujjat matni admin paneldan (GET /api/public/settings). HTML bo'lsa tozalanib ko'rsatiladi
export default function LegalPage() {
    const { type } = useParams()
    const navigate = useNavigate()
    const { data, error, loading, reload } = useResource(() => settingsApi.publicSettings(), [], { cacheKey: 'public_settings' })
    const text = type === 'privacy' ? data?.privacy_policy : data?.public_offer
    const isHtml = /<[a-z][\s\S]*>/i.test(text || '')

    return (
        <AuthShell onBack={() => (window.history.length > 1 ? navigate(-1) : navigate(getToken() ? '/settings' : '/login'))}>
            <h1 className="mt-4 text-[26px] font-extrabold tracking-tight">{TITLES[type] || 'Hujjat'}</h1>
            <div className="mt-4 text-[15px] leading-relaxed text-ink">
                {loading && !text && <div className="space-y-3"><Skeleton className="h-4" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-4 w-2/3" /></div>}
                {error && !text && <ErrorState onRetry={reload} />}
                {text && (isHtml
                    ? <div className="legal space-y-3 [&_a]:text-brand-strong [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />
                    : <div className="whitespace-pre-wrap">{text}</div>)}
                {!loading && !error && !text && <p className="text-ink-2">Matn hali kiritilmagan.</p>}
            </div>
        </AuthShell>
    )
}
