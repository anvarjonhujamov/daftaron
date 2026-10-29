import { useEffect, useRef, useState } from 'react'
import { X, Delete } from 'lucide-react'
import { Button, MoneyInput, TextArea, cx } from './controls'
import { formatNumber } from '../utils/format'

// Modal oyna: telefonda pastdan chiquvchi panel, planshet/kompyuterda markazda (index.css: dialog.sheet).
// Native <dialog>: Esc yopadi, fokus ichkarida qoladi. onSubmit bo'lsa ichi <form> — Enter saqlaydi.
export function Sheet({ open, onClose, title, subtitle, children, footer, onSubmit, width = 640, labelledBy }) {
    const ref = useRef(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        if (open && !el.open) el.showModal()
        if (!open && el.open) el.close()
    }, [open])

    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
    }, [open])

    const Body = onSubmit ? 'form' : 'div'
    return (
        <dialog
            ref={ref}
            className="sheet"
            style={{ '--sheet-w': `${width}px` }}
            aria-label={labelledBy ? undefined : title}
            onCancel={(e) => { e.preventDefault(); onClose() }}
            onClick={(e) => e.target === ref.current && onClose()}
        >
            {open && (
                <Body
                    onSubmit={onSubmit ? (e) => { e.preventDefault(); onSubmit() } : undefined}
                    className="flex max-h-[100dvh] flex-col rounded-t-[24px] bg-card md:max-h-[calc(100dvh-48px)] md:rounded-[20px]"
                    noValidate
                >
                    <div className="mx-auto mt-2 h-[5px] w-10 shrink-0 rounded-full bg-line-2 md:hidden" aria-hidden />
                    <div className="flex shrink-0 items-start gap-3 px-5 pb-2 pt-2 md:px-6 md:pt-5">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-[21px] font-extrabold tracking-tight">{title}</h2>
                            {subtitle && <p className="mt-0.5 text-sm text-ink-2">{subtitle}</p>}
                        </div>
                        <button type="button" aria-label="Yopish" onClick={onClose} className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-ink hover:bg-line">
                            <X size={20} aria-hidden />
                        </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 md:px-6">{children}</div>
                    {footer && <div className="pb-safe shrink-0 border-t border-line px-5 py-3 md:px-6 md:py-4">{footer}</div>}
                </Body>
            )}
        </dialog>
    )
}

// Tasdiqlash oynasi; reason=true bo'lsa sabab so'raladi (uzaytirish, bekor qilish — audit uchun)
export function Confirm({ open, onClose, onConfirm, title, text, confirmText = 'Tasdiqlash', danger, reason, reasonRequired, reasonLabel = 'Sabab' }) {
    const [value, setValue] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => { if (open) setValue('') }, [open])

    const submit = async () => {
        if (reasonRequired && !value.trim()) return
        setBusy(true)
        try {
            await onConfirm(value.trim())
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={title}
            width={480}
            onSubmit={submit}
            footer={
                <div className="flex gap-2">
                    <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Bekor qilish</Button>
                    <Button type="submit" variant={danger ? 'danger' : 'primary'} size="lg" className="flex-1" loading={busy} disabled={reasonRequired && !value.trim()}>
                        {confirmText}
                    </Button>
                </div>
            }
        >
            {text && <p className="text-[15px] leading-relaxed text-ink-2">{text}</p>}
            {reason && <TextArea className="mt-4" label={reasonLabel} value={value} onChange={(e) => setValue(e.target.value)} rows={2} maxLength={500} />}
        </Sheet>
    )
}

// Summa kiritish: telefonda katta raqamli klaviatura, planshet/kompyuterda oddiy maydon
export function AmountPad({ value, onChange, tone = 'text-debt', hint, label = 'Summa', autoFocus }) {
    const press = (key) => {
        const s = String(value || '')
        if (key === 'del') return onChange(parseInt(s.slice(0, -1) || '0', 10))
        const next = parseInt((s === '0' ? '' : s) + key, 10)
        if (next <= 99999999999) onChange(next)
    }
    return (
        <div>
            <div className="md:hidden">
                <div className="rounded-2xl bg-soft/70 py-2 text-center" aria-live="polite">
                    <div className="text-[13px] font-semibold text-ink-3">{label}</div>
                    <div className={cx('text-[34px] font-extrabold tracking-tight', tone)}>
                        {formatNumber(value || 0)} <span className="text-[17px] font-bold text-ink-2">so'm</span>
                    </div>
                    {hint && <div className="text-[13px] text-ink-2">{hint}</div>}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0'].map((k) => (
                        <button key={k} type="button" onClick={() => press(k)} className="h-11 rounded-xl bg-soft text-[20px] font-semibold text-ink active:bg-line">{k}</button>
                    ))}
                    <button type="button" aria-label="O'chirish" onClick={() => press('del')} className="flex h-11 items-center justify-center rounded-xl bg-soft text-ink active:bg-line">
                        <Delete size={22} aria-hidden />
                    </button>
                </div>
            </div>
            <div className="hidden md:block">
                <MoneyInput label={label} value={value} onChange={onChange} hint={hint} autoFocus={autoFocus} big />
            </div>
        </div>
    )
}
