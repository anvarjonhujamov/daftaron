import { forwardRef, useId } from 'react'
import { Loader2 } from 'lucide-react'
import { formatNumber, parseCurrency } from '../utils/format'
import { formatLocal, phoneDigits } from '../utils/phone'

const cx = (...c) => c.filter(Boolean).join(' ')
export { cx }

const VARIANTS = {
    primary: 'bg-brand text-white hover:bg-brand/90',
    dark: 'bg-ink text-card hover:bg-ink/90',
    pay: 'bg-pay-strong text-white hover:bg-pay-strong/90',
    danger: 'bg-danger text-white hover:bg-danger/90',
    secondary: 'bg-card text-ink border-[1.5px] border-line-2 hover:bg-soft',
    soft: 'bg-soft text-ink hover:bg-line',
    ghost: 'text-brand-strong hover:bg-brand-soft',
    'danger-ghost': 'text-debt hover:bg-debt-soft'
}
const SIZES = {
    lg: 'h-14 px-5 text-[17px] rounded-ctl md:h-12 md:text-[15px]',
    md: 'h-11 px-4 text-[15px] rounded-xl',
    sm: 'h-9 px-3 text-sm rounded-[10px]'
}

export const Button = forwardRef(function Button(
    { variant = 'primary', size = 'md', block, loading, icon: Icon, children, className, disabled, type = 'button', ...rest },
    ref
) {
    return (
        <button
            ref={ref}
            type={type}
            disabled={disabled || loading}
            className={cx(
                'inline-flex shrink-0 select-none items-center justify-center gap-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                VARIANTS[variant], SIZES[size], block && 'w-full', className
            )}
            {...rest}
        >
            {loading ? <Loader2 size={18} className="animate-spin" aria-hidden /> : Icon && <Icon size={size === 'sm' ? 16 : 20} aria-hidden />}
            {children}
        </button>
    )
})

export function Field({ label, required, hint, error, children, className, htmlFor }) {
    return (
        <div className={cx('flex flex-col', className)}>
            {label && (
                <label htmlFor={htmlFor} className="mb-2 text-sm font-semibold text-ink">
                    {label}{required && <span className="text-debt"> *</span>}
                </label>
            )}
            {children}
            {error ? (
                <p role="alert" className="mt-1.5 text-[13px] font-medium text-debt">{error}</p>
            ) : hint ? (
                <p className="mt-1.5 text-[13px] text-ink-3">{hint}</p>
            ) : null}
        </div>
    )
}

const inputBox = (error) => cx(
    'w-full rounded-ctl border-[1.5px] bg-card px-4 text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-brand focus:ring-2 focus:ring-brand/20',
    error ? 'border-debt' : 'border-line-2'
)

export const Input = forwardRef(function Input({ label, required, hint, error, className, size = 'lg', id, ...rest }, ref) {
    const autoId = useId()
    const inputId = id || autoId
    return (
        <Field label={label} required={required} hint={hint} error={error} className={className} htmlFor={inputId}>
            <input
                ref={ref}
                id={inputId}
                aria-invalid={!!error}
                className={cx(inputBox(error), size === 'lg' ? 'h-14 text-[17px] font-semibold md:h-12 md:text-base' : 'h-11 text-[15px]')}
                {...rest}
            />
        </Field>
    )
})

export function TextArea({ label, hint, error, className, rows = 3, id, ...rest }) {
    const autoId = useId()
    return (
        <Field label={label} hint={hint} error={error} className={className} htmlFor={id || autoId}>
            <textarea id={id || autoId} rows={rows} className={cx(inputBox(error), 'py-3 text-[15px]')} {...rest} />
        </Field>
    )
}

// Summa: ko'rinishda "1 250 000", qiymat — butun son
export function MoneyInput({ value, onChange, label, hint, error, className, autoFocus, id, placeholder = '0', big }) {
    const autoId = useId()
    const inputId = id || autoId
    return (
        <Field label={label} hint={hint} error={error} className={className} htmlFor={inputId}>
            <div className={cx(inputBox(error), 'flex items-center gap-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20', big ? 'h-16' : 'h-14 md:h-12')}>
                <input
                    id={inputId}
                    inputMode="numeric"
                    autoComplete="off"
                    autoFocus={autoFocus}
                    placeholder={placeholder}
                    aria-invalid={!!error}
                    value={value ? formatNumber(value) : ''}
                    onChange={(e) => onChange(Math.min(parseCurrency(e.target.value), 99999999999))}
                    className={cx('w-full min-w-0 bg-transparent font-extrabold text-ink outline-none placeholder:text-ink-3', big ? 'text-[28px]' : 'text-[19px]')}
                />
                <span className="shrink-0 font-semibold text-ink-2">so'm</span>
            </div>
        </Field>
    )
}

// Telefon: "+998" doimiy, 9 raqam yozish paytida "90 123 45 67" bo'lib turadi
export function PhoneInput({ value, onChange, label = 'Telefon raqam', required, hint, error, className, autoFocus, id, onEnter, children }) {
    const autoId = useId()
    const inputId = id || autoId
    return (
        <Field label={label} required={required} hint={hint} error={error} className={className} htmlFor={inputId}>
            <div className={cx(inputBox(error), 'flex h-14 items-center gap-2.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 md:h-12')}>
                <span className="text-[17px] font-semibold text-ink md:text-base">+998</span>
                <input
                    id={inputId}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    autoFocus={autoFocus}
                    placeholder="90 123 45 67"
                    aria-invalid={!!error}
                    value={formatLocal(value)}
                    onChange={(e) => onChange(phoneDigits(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
                    className="w-full min-w-0 bg-transparent text-[17px] font-semibold text-ink outline-none placeholder:text-ink-3 md:text-base"
                />
                {children}
            </div>
        </Field>
    )
}

// Tanlov tugmalari (Bugun / Kecha / Boshqa, Naqd / Karta ...). options: [{ value, label }]
export function Chips({ options, value, onChange, className, size = 'md', ariaLabel, wrap, scroll }) {
    return (
        <div role="radiogroup" aria-label={ariaLabel} className={cx('flex gap-2', wrap ? 'flex-wrap' : 'no-scrollbar overflow-x-auto', className)}>
            {options.map((o) => {
                const active = o.value === value
                return (
                    <button
                        key={String(o.value)}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={o.disabled}
                        onClick={() => onChange(o.value)}
                        className={cx(
                            'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-sm transition-colors disabled:opacity-40',
                            size === 'sm' ? 'h-9' : 'h-11',
                            // Bir qatorli guruhda tugmalar joyni teng bo'lib oladi va tor ekranda siqiladi;
                            // scroll — ko'p variantli filtr: tabiiy kenglik, qator yonga suriladi
                            wrap || scroll ? 'shrink-0 px-3.5' : o.narrow ? 'w-11 shrink-0' : 'min-w-0 flex-1 px-2',
                            active
                                ? 'border-2 border-brand bg-brand-soft font-bold text-brand-strong'
                                : 'border-[1.5px] border-line-2 bg-card font-semibold text-ink hover:bg-soft'
                        )}
                    >
                        {o.icon && <o.icon size={16} aria-hidden />}
                        {o.label}
                        {o.count !== undefined && <span className="text-ink-3">{o.count}</span>}
                    </button>
                )
            })}
        </div>
    )
}

// Ikki holatli almashtirgich (iOS uslubi); label bilan butun qator bosiladi
export function Toggle({ checked, onChange, label, description, disabled, className }) {
    const id = useId()
    return (
        <div className={cx('flex items-center justify-between gap-3', className)}>
            {(label || description) && (
                <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-[15px] leading-snug">
                    {label && <span className="block font-semibold text-ink">{label}</span>}
                    {description && <span className="block text-[13px] text-ink-2">{description}</span>}
                </label>
            )}
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={!!checked}
                aria-label={!label ? description : undefined}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50', checked ? 'bg-pay-strong' : 'bg-line-2')}
            >
                <span className={cx('absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-all', checked ? 'left-[23px]' : 'left-[3px]')} />
            </button>
        </div>
    )
}

export function Checkbox({ checked, onChange, label, description, className, disabled }) {
    return (
        <label className={cx('flex cursor-pointer items-center justify-between gap-3 py-1', disabled && 'opacity-50', className)}>
            <span className="min-w-0 text-[15px] leading-snug">
                <span className="block font-semibold text-ink">{label}</span>
                {description && <span className="block text-[13px] text-ink-2">{description}</span>}
            </span>
            <input
                type="checkbox"
                checked={!!checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="h-6 w-6 shrink-0 cursor-pointer rounded-md accent-[rgb(var(--brand))]"
            />
        </label>
    )
}

export function Select({ label, error, hint, options, value, onChange, placeholder = 'Tanlang', className, id, disabled }) {
    const autoId = useId()
    return (
        <Field label={label} error={error} hint={hint} className={className} htmlFor={id || autoId}>
            <select
                id={id || autoId}
                value={value ?? ''}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
                className={cx(inputBox(error), 'h-12 text-[15px] font-medium disabled:opacity-60')}
            >
                <option value="">{placeholder}</option>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </Field>
    )
}
