import { useState } from 'react'
import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react'
import toast from 'react-hot-toast'
import AiText, { plainText } from './AiText'
import { cx } from '../../ui/controls'
import { t } from '../../i18n'

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        // Eski WebView (Telegram): vaqtinchalik maydon orqali
        const el = document.createElement('textarea')
        el.value = text
        el.setAttribute('readonly', '')
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        let ok = false
        try { ok = document.execCommand('copy') } catch { ok = false }
        el.remove()
        return ok
    }
}

function Typing({ lookingUp }) {
    return (
        <span className="flex items-center gap-2 text-[14px] text-ink-3">
            <span className="flex gap-1" aria-hidden>
                {[0, 1, 2].map((i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-ink-3 motion-safe:animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
            </span>
            {lookingUp ? t("Ma'lumotlar ko'rilmoqda…") : t('yozmoqda…')}
        </span>
    )
}

function ActionButton({ label, pressed, onClick, children, className }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={pressed}
            onClick={onClick}
            className={cx('flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-soft', className)}
        >
            {children}
        </button>
    )
}

function Actions({ message, onFeedback }) {
    const [copied, setCopied] = useState(false)
    const copy = async () => {
        if (await copyText(plainText(message.text))) {
            setCopied(true)
            toast.success(t('Nusxa olindi'))
            setTimeout(() => setCopied(false), 1500)
        } else {
            toast.error(t("Nusxa olib bo'lmadi"))
        }
    }
    return (
        <div className="-ml-1 mt-0.5 flex items-center text-ink-3">
            {message.id && message.status === 'done' && (
                <>
                    <ActionButton label={t('Foydali javob')} pressed={message.feedback === 'up'} onClick={() => onFeedback(message, 'up')}
                        className={message.feedback === 'up' ? 'text-pay' : ''}>
                        <ThumbsUp size={18} fill={message.feedback === 'up' ? 'currentColor' : 'none'} aria-hidden />
                    </ActionButton>
                    <ActionButton label={t('Foydasiz javob')} pressed={message.feedback === 'down'} onClick={() => onFeedback(message, 'down')}
                        className={message.feedback === 'down' ? 'text-debt' : ''}>
                        <ThumbsDown size={18} fill={message.feedback === 'down' ? 'currentColor' : 'none'} aria-hidden />
                    </ActionButton>
                </>
            )}
            <ActionButton label={t('Nusxa olish')} onClick={copy}>
                {copied ? <Check size={18} className="text-pay" aria-hidden /> : <Copy size={18} aria-hidden />}
            </ActionButton>
            {message.status === 'stopped' && <span className="ml-1 text-[12px]">{t("Javob to'xtatildi")}</span>}
        </div>
    )
}

function Assistant({ message, onFeedback, onRetry, canRetry }) {
    const { text, status } = message
    const pending = status === 'waiting'
    return (
        <div className="flex flex-col items-start">
            {(text || pending) && (
                <div aria-busy={pending || status === 'streaming'}
                    className="max-w-[92%] rounded-[18px] rounded-bl-md border border-line bg-card px-3.5 py-2.5 text-[15px] leading-relaxed text-ink shadow-sm">
                    {text ? <AiText text={text} /> : <Typing lookingUp={message.lookingUp} />}
                    {status === 'streaming' && message.lookingUp && <div className="mt-2"><Typing lookingUp /></div>}
                </div>
            )}
            {status === 'error' && (
                <div role="alert" className="mt-1.5 flex max-w-[92%] flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-debt-soft px-3 py-2 text-[14px] font-medium text-debt">
                    <span>{message.error}</span>
                    {message.retryable && canRetry && (
                        <button type="button" onClick={() => onRetry(message.key)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-card px-3 text-[14px] font-bold text-ink hover:bg-soft">
                            <RotateCcw size={16} aria-hidden /> {t('Qayta yuborish')}
                        </button>
                    )}
                </div>
            )}
            {text && (status === 'done' || status === 'stopped') && <Actions message={message} onFeedback={onFeedback} />}
        </div>
    )
}

export default function AiMessages({ messages, onFeedback, onRetry, canRetry }) {
    return (
        <div role="log" aria-label={t('Yozishmalar')} className="space-y-3">
            {messages.map((m) => (m.role === 'user' ? (
                <div key={m.key} className="flex justify-end">
                    <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-[18px] rounded-br-md bg-brand px-3.5 py-2.5 text-[15px] leading-relaxed text-white">
                        {m.text}
                    </div>
                </div>
            ) : (
                <Assistant key={m.key} message={m} onFeedback={onFeedback} onRetry={onRetry} canRetry={canRetry} />
            )))}
        </div>
    )
}
