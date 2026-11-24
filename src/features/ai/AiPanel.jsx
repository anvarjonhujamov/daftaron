import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, History, SendHorizontal, Sparkles, Square, SquarePen, WifiOff, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { AI_MAX_LENGTH, aiApi } from '../../api/ai.api'
import { useSession } from '../../app/session'
import { errorMessage } from '../../lib/errors'
import { useOnline } from '../../lib/hooks'
import { safeUrl } from '../../lib/sanitize'
import { Button, cx } from '../../ui/controls'
import { Skeleton } from '../../ui/display'
import { Confirm } from '../../ui/Sheet'
import { t, useLang } from '../../i18n'
import { useAiChat } from './useAiChat'
import { screenFor } from './screens'
import AiMessages from './AiMessages'
import AiHistory from './AiHistory'

// AI yordamchi oynasi. Telefon (< md): pastdan chiquvchi to'liq balandlikdagi modal <dialog> (tutqich, yopish).
// Planshet/kompyuter: o'ngda 400px panel, modal emas — sahifa ishlashda davom etadi; Tab panel ichida aylanadi, Esc yopadi.
// Komponent bir marta ochilgach o'chmaydi (yopiqda yashirin) — suhbat sahifalar orasida saqlanadi.

const DESKTOP = '(min-width: 768px)'
const ENTER_SENDS = '(hover: hover) and (pointer: fine)'
const SUPPORT_FALLBACK = 'https://t.me/daftaron_support'

function useMedia(query) {
    const [match, setMatch] = useState(() => window.matchMedia(query).matches)
    useEffect(() => {
        const mq = window.matchMedia(query)
        const on = () => setMatch(mq.matches)
        on()
        mq.addEventListener('change', on)
        return () => mq.removeEventListener('change', on)
    }, [query])
    return match
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

function IconButton({ label, icon: Icon, onClick, disabled }) {
    return (
        <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors md:h-10 md:w-10 hover:bg-soft hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent">
            <Icon size={20} aria-hidden />
        </button>
    )
}

function Welcome({ name, quick, onAsk, disabled }) {
    return (
        <div className="flex flex-col items-center px-2 pb-2 pt-6 text-center">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                <Sparkles size={26} aria-hidden />
            </span>
            <p className="text-[18px] font-extrabold text-ink">{name ? t('Assalomu alaykum, {name}!', { name }) : t('Assalomu alaykum!')}</p>
            <p className="mt-1 max-w-[300px] text-[15px] leading-relaxed text-ink-2">
                {t("Men DaftarOn yordamchisiman. Ilovadan foydalanish yoki do'koningiz bo'yicha savol bering.")}
            </p>
            <div className="mt-5 flex w-full flex-col items-stretch gap-2" role="group" aria-label={t('Tezkor savollar')}>
                {quick.map((q) => (
                    <button key={q} type="button" disabled={disabled} onClick={() => onAsk(t(q))}
                        className="rounded-2xl border-[1.5px] border-line-2 bg-card px-4 py-3 text-left text-[15px] font-semibold text-ink transition-colors hover:border-brand hover:bg-brand-soft disabled:opacity-50">
                        {t(q)}
                    </button>
                ))}
            </div>
        </div>
    )
}

function Notice({ tone = 'soft', children }) {
    return (
        <div role="status" className={cx('mb-2 rounded-xl px-3 py-2.5 text-[14px] leading-snug', tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-soft text-ink-2')}>
            {children}
        </div>
    )
}

export default function AiPanel({ open, onClose }) {
    useLang()
    const session = useSession()
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const online = useOnline()
    const desktop = useMedia(DESKTOP)
    const enterSends = useMedia(ENTER_SENDS)
    const chat = useAiChat()
    const [view, setView] = useState('chat')
    const [deleting, setDeleting] = useState(null)
    const [removedId, setRemovedId] = useState(null)

    const dialogRef = useRef(null)
    const panelRef = useRef(null)
    const sheetRef = useRef(null)
    const scrollRef = useRef(null)
    const inputRef = useRef(null)
    const atBottom = useRef(true)
    const drag = useRef(null)

    const screen = screenFor(pathname)
    const context = { route: screen.route, screen: screen.screen }
    const name = (session.user?.name || session.settings?.profile?.name || '').trim().split(/\s+/)[0]
    const supportUrl = safeUrl(session.settings?.support?.telegram_support_url) || SUPPORT_FALLBACK
    const supportHandle = `@${supportUrl.match(/t\.me\/([\w]+)/i)?.[1] || 'daftaron_support'}`
    const inputDisabled = !online || !!chat.blocked
    const left = Number.isFinite(chat.usage?.left) ? chat.usage.left : null

    // Ochilganda: oldingi suhbatni tiklash, kunlik qoldiq, fokus
    useEffect(() => {
        if (!open) return
        chat.restore()
        chat.refreshUsage()
        atBottom.current = true
        const id = requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            if (desktop) inputRef.current && !inputRef.current.disabled ? inputRef.current.focus() : panelRef.current?.focus()
        })
        return () => cancelAnimationFrame(id)
    }, [open])

    // Telefon: modal dialog
    useEffect(() => {
        const el = dialogRef.current
        if (!el || desktop) return
        if (open && !el.open) {
            el.showModal()
            panelRef.current?.focus({ preventScroll: true })
        }
        if (!open && el.open) el.close()
    }, [open, desktop])

    // Keng ekranda (index.css, ≥1280px) panel sahifa ustiga tushmaydi — sahifa o'ngdan torayadi
    useEffect(() => {
        if (!desktop) return
        document.documentElement.classList.toggle('ai-open', open)
        return () => document.documentElement.classList.remove('ai-open')
    }, [open, desktop])

    // Telefon klaviaturasi: oyna ko'rinadigan qismga sig'sin (visualViewport)
    useEffect(() => {
        const el = dialogRef.current
        const vv = window.visualViewport
        if (!open || desktop || !el || !vv) return
        const apply = () => {
            el.style.setProperty('--ai-vh', `${vv.height}px`)
            el.style.setProperty('--ai-kb', `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`)
        }
        apply()
        vv.addEventListener('resize', apply)
        vv.addEventListener('scroll', apply)
        return () => {
            vv.removeEventListener('resize', apply)
            vv.removeEventListener('scroll', apply)
        }
    }, [open, desktop])

    // Yangi matn kelganda pastga (foydalanuvchi yuqoriga o'qib turgan bo'lsa — tegmaymiz)
    useLayoutEffect(() => {
        const el = scrollRef.current
        if (el && atBottom.current) el.scrollTop = el.scrollHeight
    }, [chat.messages, view])

    // Kiritish maydoni balandligi matnga qarab (CSS max-h gacha)
    useLayoutEffect(() => {
        const el = inputRef.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight + 3}px`
    }, [chat.draft, open, view])

    const ask = (value) => {
        atBottom.current = true
        return chat.send(value, context)
    }

    const submit = (e) => {
        e?.preventDefault()
        if (chat.busy || inputDisabled) return
        if (ask()) inputRef.current?.focus()
    }

    const onKeyDownInput = (e) => {
        if (e.key === 'Enter' && !e.shiftKey && enterSends && !e.nativeEvent.isComposing) {
            e.preventDefault()
            submit()
        }
    }

    // Kompyuter paneli: Tab ichkarida aylanadi, Esc yopadi; sahifa tezkor tugmalari (N, T, M) bu yerda ishlamaydi
    const onKeyDownPanel = (e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
            return
        }
        if (e.key !== 'Tab') return
        const nodes = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null)
        if (!nodes.length) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
            e.preventDefault()
            last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
        }
    }

    // Telefon: tutqichni pastga tortib yopish
    const dragStart = (e) => {
        drag.current = { y: e.clientY, dy: 0 }
        e.currentTarget.setPointerCapture?.(e.pointerId)
        if (sheetRef.current) sheetRef.current.style.transition = 'none'
    }
    const dragMove = (e) => {
        if (!drag.current || !sheetRef.current) return
        drag.current.dy = Math.max(0, e.clientY - drag.current.y)
        sheetRef.current.style.transform = `translateY(${drag.current.dy}px)`
    }
    const dragEnd = () => {
        if (!drag.current) return
        const { dy } = drag.current
        drag.current = null
        if (sheetRef.current) {
            sheetRef.current.style.transition = ''
            sheetRef.current.style.transform = ''
        }
        if (dy > 110) onClose()
    }

    const openPlans = () => {
        navigate('/subscription')
        if (!desktop) onClose()
    }

    const openFromHistory = async (id) => {
        if (id !== chat.conversationId || !chat.messages.length) {
            atBottom.current = true
            await chat.openConversation(id)
        }
        setView('chat')
    }

    const confirmDelete = useCallback(async () => {
        const conv = deleting
        try {
            await aiApi.deleteConversation(conv.id)
            chat.forget(conv.id)
            setRemovedId(conv.id)
            toast.success(t("Suhbat o'chirildi"))
            setDeleting(null)
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }, [deleting, chat.forget])

    const newChat = () => {
        chat.newChat()
        setView('chat')
        requestAnimationFrame(() => (desktop ? inputRef.current?.focus() : null))
    }

    const header = (
        <div className="flex shrink-0 items-center gap-1 border-b border-line bg-card px-2 pb-2 pt-1 md:px-3 md:py-2.5">
            {view === 'history' ? (
                <IconButton label={t('Orqaga')} icon={ChevronLeft} onClick={() => setView('chat')} />
            ) : (
                <span className="ml-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-white md:flex" aria-hidden>
                    <Sparkles size={17} />
                </span>
            )}
            <div className="min-w-0 flex-1 px-1.5">
                <h2 className="truncate text-[17px] font-extrabold leading-tight tracking-tight md:text-[16px]">
                    {view === 'history' ? t('Suhbatlar tarixi') : t('DaftarOn yordamchisi')}
                </h2>
                {view === 'chat' && chat.title && <p className="truncate text-[13px] text-ink-3">{chat.title}</p>}
            </div>
            {view === 'chat' && (
                <>
                    <IconButton label={t('Yangi suhbat')} icon={SquarePen} onClick={newChat} disabled={!chat.messages.length && !chat.conversationId} />
                    <IconButton label={t('Suhbatlar tarixi')} icon={History} onClick={() => setView('history')} />
                </>
            )}
            <IconButton label={t('Yopish')} icon={X} onClick={onClose} />
        </div>
    )

    const composer = (
        <div className="pb-safe shrink-0 border-t border-line bg-card px-3 pt-2.5 md:px-4">
            {!online && (
                <Notice tone="warn">
                    <span className="flex items-center gap-2 font-semibold"><WifiOff size={16} aria-hidden /> {t('Internetga ulaning')}</span>
                </Notice>
            )}
            {online && chat.blocked?.type === 'limit' && (
                <Notice tone="warn">
                    <p className="font-semibold">{t("Bugungi savollar limiti tugadi. Ertaga yana so'rashingiz yoki Pro ta'rifga o'tishingiz mumkin")}</p>
                    {session.isOwner && <Button size="sm" variant="secondary" className="mt-2" onClick={openPlans}>{t("Ta'riflar")}</Button>}
                </Notice>
            )}
            {online && chat.blocked?.type === 'disabled' && (
                <Notice>
                    {t('Yordamchi vaqtincha ishlamayapti. {link} ga yozing', {
                        link: <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-strong underline">{supportHandle}</a>
                    })}
                </Notice>
            )}
            <form onSubmit={submit} className="flex items-end gap-2">
                <textarea
                    ref={inputRef}
                    rows={1}
                    value={chat.draft}
                    onChange={(e) => chat.setDraft(e.target.value.slice(0, AI_MAX_LENGTH))}
                    onKeyDown={onKeyDownInput}
                    maxLength={AI_MAX_LENGTH}
                    disabled={inputDisabled}
                    enterKeyHint={enterSends ? 'send' : 'enter'}
                    placeholder={!online ? t('Internetga ulaning') : t('Savolingizni yozing…')}
                    aria-label={t('Savol')}
                    className="max-h-36 min-h-[48px] min-w-0 flex-1 resize-none rounded-ctl border-[1.5px] border-line-2 bg-card px-3.5 py-[11px] leading-snug text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:border-line-2 disabled:bg-soft disabled:text-ink-3 disabled:ring-0"
                />
                {chat.busy ? (
                    <button type="button" onClick={chat.stop} aria-label={t("Javobni to'xtatish")} title={t("Javobni to'xtatish")}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink text-card transition-colors hover:bg-ink/90">
                        <Square size={16} fill="currentColor" aria-hidden />
                    </button>
                ) : (
                    <button type="submit" aria-label={t('Yuborish')} title={t('Yuborish')} disabled={!chat.draft.trim() || inputDisabled}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40">
                        <SendHorizontal size={20} aria-hidden />
                    </button>
                )}
            </form>
            {chat.draft.length > AI_MAX_LENGTH - 200 && (
                <p className="mt-1 text-right text-[12px] text-ink-3" aria-live="polite">{chat.draft.length}/{AI_MAX_LENGTH}</p>
            )}
            <p className="py-2 text-center text-[12px] leading-snug text-ink-3">
                {t('AI xato qilishi mumkin. Muhim raqamlarni tekshiring.')}
                {left !== null && <> <span className="whitespace-nowrap font-semibold">{t('Bugun {n} ta savol qoldi', { n: left })}</span></>}
            </p>
        </div>
    )

    const body = view === 'history' ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <AiHistory currentId={chat.conversationId} onOpen={openFromHistory} onDelete={setDeleting} removedId={removedId} />
        </div>
    ) : (
        <>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 md:px-4"
                onScroll={(e) => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80 }}>
                {chat.loading ? (
                    <div className="space-y-3" aria-busy="true" aria-label={t('Yuklanmoqda')}>
                        <Skeleton className="ml-auto h-10 w-2/3 rounded-[18px]" />
                        <Skeleton className="h-24 w-4/5 rounded-[18px]" />
                        <Skeleton className="ml-auto h-10 w-1/2 rounded-[18px]" />
                    </div>
                ) : chat.messages.length ? (
                    <AiMessages messages={chat.messages} onFeedback={chat.feedback} canRetry={online && !chat.busy && !chat.blocked}
                        onRetry={(key) => { atBottom.current = true; chat.retry(key, context) }} />
                ) : (
                    <Welcome name={name} quick={screen.quick} onAsk={ask} disabled={inputDisabled} />
                )}
            </div>
            {composer}
        </>
    )

    const confirm = (
        <Confirm open={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} danger
            title={t("Suhbatni o'chirish")} confirmText={t("O'chirish")}
            text={t("«{title}» suhbati butunlay o'chiriladi.",{ title: deleting?.title || t('Nomsiz suhbat') })} />
    )

    if (desktop) {
        return (
            <>
                <aside
                    ref={panelRef}
                    role="dialog"
                    aria-modal="false"
                    aria-label={t('DaftarOn yordamchisi')}
                    tabIndex={-1}
                    onKeyDown={onKeyDownPanel}
                    className={cx('ai-panel fixed inset-y-0 right-0 z-40 w-[400px] max-w-full flex-col border-l border-line bg-bg text-ink shadow-2xl outline-none',
                        open ? 'flex' : 'hidden')}
                >
                    {header}
                    {body}
                </aside>
                {confirm}
            </>
        )
    }

    return (
        <>
            <dialog
                ref={dialogRef}
                data-ai-panel=""
                className="ai-sheet"
                aria-label={t('DaftarOn yordamchisi')}
                onCancel={(e) => {
                    if (e.target !== e.currentTarget) return
                    e.preventDefault()
                    onClose()
                }}
                onClick={(e) => e.target === dialogRef.current && onClose()}
            >
                <div ref={sheetRef} className="flex h-full flex-col overflow-hidden rounded-t-[24px] bg-bg transition-transform">
                    <div className="shrink-0 cursor-grab touch-none bg-card pb-1 pt-2" onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}>
                        <div className="mx-auto h-[5px] w-10 rounded-full bg-line-2" aria-hidden />
                    </div>
                    {/* Ochilganda fokus shu yerga — klaviatura o'z-o'zidan ochilmasin */}
                    <div ref={panelRef} tabIndex={-1} className="flex min-h-0 flex-1 flex-col outline-none">
                        {header}
                        {body}
                    </div>
                </div>
            </dialog>
            {confirm}
        </>
    )
}
