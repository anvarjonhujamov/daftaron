import { Check, X } from 'lucide-react'
import { cx } from '../ui/controls'
import { formatMoney, formatNumber } from '../utils/format'
import { PACKAGE_UNITS } from './PlanCards'
import { t } from '../i18n'

// Limit: null — cheksiz, 0 — yo'q
const limit = (v, text, unlimited, none) => {
    if (v === null || v === undefined) return { ok: true, text: unlimited }
    if (Number(v) === 0) return { ok: false, text: none }
    return { ok: true, text: text(formatNumber(v)) }
}

// Bepul sinovda nimalar beriladi — admin paneldagi «Bepul sinov» sozlamasi (subscription/status → trial_policy, usage.trial)
export const trialFeatures = (tp) => [
    limit(tp.debt_limit, (n) => t('{n} ta nasiya yozish', { n }), t('Cheksiz nasiya'), t("Nasiya yozib bo'lmaydi")),
    limit(tp.sms_limit, (n) => t('{n} ta bepul SMS', { n }), t('Cheksiz SMS'), t("Bepul SMS yo'q")),
    tp.sms_overage
        ? { ok: true, text: t('Bepul SMS tugagach — {price}/SMS balansdan', { price: formatMoney(tp.sms_price) }) }
        : { ok: false, text: t("Bepul SMS tugagach SMS yuborilmaydi") },
    limit(tp.shop_limit, (n) => t("{n} ta do'kon", { n }), t("Cheksiz do'kon"), t("Do'kon yo'q")),
    limit(tp.worker_limit, (n) => t('{n} ta xodim', { n }), t('Cheksiz xodim'), t("Xodim qo'shib bo'lmaydi")),
    limit(tp.supplier_limit, (n) => t("{n} ta ta'minotchi", { n }), t("Cheksiz ta'minotchi"), t("Ta'minotchi qo'shib bo'lmaydi")),
    { ok: !!tp.allow_export, text: t("Excel'ga yuklash") },
    tp.extra_packages?.length
        ? { ok: true, text: t("Qo'shimcha paketlar: {list}", { list: tp.extra_packages.map((x) => t(PACKAGE_UNITS[x]) || x).join(', ') }) }
        : { ok: false, text: t("Qo'shimcha paketlar yo'q") }
]

export default function TrialFeatures({ trial, className }) {
    if (!trial) return null
    return (
        <ul className={cx('space-y-1.5 text-[15px]', className)} aria-label={t('Bepul sinovda')}>
            {trialFeatures(trial).map((f) => (
                <li key={f.text} className={cx('flex items-center gap-2', f.ok ? 'text-ink-2' : 'text-ink-3')}>
                    {f.ok ? <Check size={16} className="shrink-0 text-pay" aria-hidden /> : <X size={16} className="shrink-0" aria-hidden />}
                    {f.text}
                </li>
            ))}
        </ul>
    )
}
