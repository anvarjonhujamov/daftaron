import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { useSession } from '../../app/session'
import { cx } from '../../ui/controls'
import { t, useLang } from '../../i18n'
import { AI_OPEN_EVENT } from './events'
import { aiApi } from '../../api/ai.api'

// AI yordamchi tugmasi — Layout'da bir marta (barcha ichki sahifalarda). Panel kodi birinchi ochilganda yuklanadi
// va keyin o'chmaydi: suhbat sahifalar orasida saqlanadi.
//
// Tugma yashirinadi: panel ochiq, boshqa oyna (<dialog>, masalan «Yangi nasiya») ochiq yoki telefon klaviaturasi ochiq.
// Pastki panel (masalan Muddati o'tganlar sahifasidagi «Tanlanganlarga SMS») tugma bilan ustma-ust tushsa, tugma
// undan yuqoriga suriladi — bunday element `data-fab-avoid` atributi bilan belgilanadi.

const loadPanel = () => import('./AiPanel')
const AiPanel = lazy(loadPanel)

const TIP_KEY = 'ai_tip_seen'
let tipSeenMemory = false
const tipSeen = () => {
    try { return localStorage.getItem(TIP_KEY) === '1' || tipSeenMemory } catch { return tipSeenMemory }
}
const markTipSeen = () => {
    tipSeenMemory = true
    try { localStorage.setItem(TIP_KEY, '1') } catch { /* localStorage yopiq — shu sessiyada eslab qolamiz */ }
}

const isEditable = (el) => !!el && (el.isContentEditable
    || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
    || (el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color'].includes(el.type)))

// Tugma holati: { dialog, keyboard, avoid } — DOM o'zgarishi, o'lcham va fokus bo'yicha (kadrda bir marta)
function usePlacement(paused) {
    const [state, setState] = useState({ dialog: false, keyboard: false, avoid: 0 })
    useEffect(() => {
        if (paused) return
        let raf = 0
        const measure = () => {
            raf = 0
            const dialog = !!document.querySelector('dialog[open]:not([data-ai-panel])')
            const coarse = window.matchMedia('(pointer: coarse)').matches
            const vv = window.visualViewport
            const keyboard = coarse && ((vv && window.innerHeight - vv.height > 150) || isEditable(document.activeElement))
            const right = window.innerWidth >= 768 ? 24 : 16
            const fabLeft = window.innerWidth - right - 56
            const fabRight = window.innerWidth - right
            let avoid = 0
            document.querySelectorAll('[data-fab-avoid]').forEach((el) => {
                const r = el.getBoundingClientRect()
                if (!r.width || !r.height || r.right < fabLeft || r.left > fabRight) return
                avoid = Math.max(avoid, Math.round(window.innerHeight - r.top + 12))
            })
            setState((s) => (s.dialog === dialog && s.keyboard === keyboard && s.avoid === avoid ? s : { dialog, keyboard, avoid }))
        }
        const schedule = () => { if (!raf) raf = requestAnimationFrame(measure) }
        const observer = new MutationObserver(schedule)
        observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'data-fab-avoid', 'class'] })
        window.addEventListener('resize', schedule)
        window.visualViewport?.addEventListener('resize', schedule)
        document.addEventListener('focusin', schedule)
        document.addEventListener('focusout', schedule)
        schedule()
        return () => {
            observer.disconnect()
            if (raf) cancelAnimationFrame(raf)
            window.removeEventListener('resize', schedule)
            window.visualViewport?.removeEventListener('resize', schedule)
            document.removeEventListener('focusin', schedule)
            document.removeEventListener('focusout', schedule)
        }
    }, [paused])
    return state
}

// Birinchi marta: «Savolingiz bormi?» — bir marta ko'rsatiladi
function useFirstTip(canShow) {
    const [show, setShow] = useState(false)
    useEffect(() => {
        if (!canShow || tipSeen()) return
        const id = setTimeout(() => {
            markTipSeen()
            setShow(true)
        }, 1500)
        return () => clearTimeout(id)
    }, [canShow])
    useEffect(() => {
        if (!show) return
        const id = setTimeout(() => setShow(false), 10000)
        return () => clearTimeout(id)
    }, [show])
    return [show && canShow, () => setShow(false)]
}

// Yordamchi yoqilganmi: backend'da /ai/* yo'q (404) yoki o'chirilgan (enabled: false, 503 ai_disabled) bo'lsa tugma ko'rinmaydi.
// Tarmoq xatosida tugma ko'rinadi (panel o'zi holatni ko'rsatadi). O'chiq bo'lsa ilovaga qaytganda qayta tekshiriladi (5 daqiqada bir)
function useAvailable(userId, tenantId) {
    const [available, setAvailable] = useState(false)
    useEffect(() => {
        let alive = true
        let checkedAt = 0
        let on = false
        const check = () => {
            checkedAt = Date.now()
            aiApi.usage()
                .then((u) => { on = u?.enabled !== false })
                .catch((err) => {
                    const status = err?.response?.status
                    on = !(status === 404 || (status === 503 && err.response.data?.reason === 'ai_disabled'))
                })
                .finally(() => alive && setAvailable(on))
        }
        const onVisible = () => {
            if (document.visibilityState === 'visible' && !on && Date.now() - checkedAt > 300000) check()
        }
        if (userId) check()
        document.addEventListener('visibilitychange', onVisible)
        return () => {
            alive = false
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [userId, tenantId])
    return available
}

export default function AiAssistant() {
    useLang()
    const session = useSession()
    const [open, setOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const fabRef = useRef(null)
    const available = useAvailable(session.user?.id, session.user?.tenant_id)
    const place = usePlacement(open)
    const hidden = !available || open || place.dialog || place.keyboard
    const [tip, hideTip] = useFirstTip(!hidden)

    const openPanel = () => {
        hideTip()
        setMounted(true)
        setOpen(true)
    }
    useEffect(() => {
        const onOpen = () => openPanel()
        window.addEventListener(AI_OPEN_EVENT, onOpen)
        return () => window.removeEventListener(AI_OPEN_EVENT, onOpen)
    }, [])

    const closePanel = () => {
        setOpen(false)
        // Klaviatura foydalanuvchisi uchun fokus tugmaga qaytadi
        requestAnimationFrame(() => fabRef.current?.focus({ preventScroll: true }))
    }

    return (
        <>
            <div className={cx('ai-fab fixed z-[35]', hidden && 'hidden')} style={{ '--fab-avoid': `${place.avoid}px` }}>
                {tip && (
                    <div id="ai-fab-tip" role="tooltip"
                        className="absolute bottom-full right-0 mb-3 flex w-max max-w-[230px] items-start gap-1 rounded-2xl bg-ink py-2 pl-3.5 pr-1.5 text-[14px] font-semibold leading-snug text-card shadow-xl">
                        <button type="button" onClick={openPanel} className="py-1 text-left">{t("Savolingiz bormi? Yordamchidan so'rang")}</button>
                        <button type="button" onClick={hideTip} aria-label={t('Yopish')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-card/15">
                            <X size={16} aria-hidden />
                        </button>
                        <span className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 bg-ink" aria-hidden />
                    </div>
                )}
                <button
                    ref={fabRef}
                    type="button"
                    onClick={openPanel}
                    onPointerEnter={loadPanel}
                    onPointerDown={loadPanel}
                    onFocus={loadPanel}
                    aria-label={t('AI yordamchi')}
                    aria-describedby={tip ? 'ai-fab-tip' : undefined}
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    title={t('AI yordamchi')}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/30 transition-transform hover:bg-brand/90 active:scale-95"
                >
                    <Sparkles size={26} aria-hidden />
                </button>
            </div>
            {mounted && (
                <Suspense fallback={open ? (
                    <div className="ai-fab fixed z-[35] flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg" role="status" aria-label={t('Yuklanmoqda')}>
                        <Loader2 size={24} className="animate-spin" aria-hidden />
                    </div>
                ) : null}>
                    <AiPanel key={`${session.user?.id ?? 0}:${session.user?.tenant_id ?? 0}`} open={open} onClose={closePanel} />
                </Suspense>
            )}
        </>
    )
}
