import { Check, X } from 'lucide-react'
import { cx } from '../ui/controls'
import { formatMoney, formatNumber } from '../utils/format'
import { PACKAGE_UNITS } from './PlanCards'

// Limit: null — cheksiz, 0 — yo'q
const limit = (v, text, unlimited, none) => {
    if (v === null || v === undefined) return { ok: true, text: unlimited }
    if (Number(v) === 0) return { ok: false, text: none }
    return { ok: true, text: text(formatNumber(v)) }
}

// Bepul sinovda nimalar beriladi — admin paneldagi «Bepul sinov» sozlamasi (subscription/status → trial_policy, usage.trial)
export const trialFeatures = (t) => [
    limit(t.debt_limit, (n) => `${n} ta nasiya yozish`, 'Cheksiz nasiya', "Nasiya yozib bo'lmaydi"),
    limit(t.sms_limit, (n) => `${n} ta bepul SMS`, 'Cheksiz SMS', "Bepul SMS yo'q"),
    t.sms_overage
        ? { ok: true, text: `Bepul SMS tugagach — ${formatMoney(t.sms_price)}/SMS balansdan` }
        : { ok: false, text: "Bepul SMS tugagach SMS yuborilmaydi" },
    limit(t.shop_limit, (n) => `${n} ta do'kon`, "Cheksiz do'kon", "Do'kon yo'q"),
    limit(t.worker_limit, (n) => `${n} ta xodim`, 'Cheksiz xodim', "Xodim qo'shib bo'lmaydi"),
    limit(t.supplier_limit, (n) => `${n} ta ta'minotchi`, "Cheksiz ta'minotchi", "Ta'minotchi qo'shib bo'lmaydi"),
    { ok: !!t.allow_export, text: "Excel'ga yuklash" },
    t.extra_packages?.length
        ? { ok: true, text: `Qo'shimcha paketlar: ${t.extra_packages.map((x) => PACKAGE_UNITS[x] || x).join(', ')}` }
        : { ok: false, text: "Qo'shimcha paketlar yo'q" }
]

export default function TrialFeatures({ trial, className }) {
    if (!trial) return null
    return (
        <ul className={cx('space-y-1.5 text-[15px]', className)} aria-label="Bepul sinovda">
            {trialFeatures(trial).map((f) => (
                <li key={f.text} className={cx('flex items-center gap-2', f.ok ? 'text-ink-2' : 'text-ink-3')}>
                    {f.ok ? <Check size={16} className="shrink-0 text-pay" aria-hidden /> : <X size={16} className="shrink-0" aria-hidden />}
                    {f.text}
                </li>
            ))}
        </ul>
    )
}
