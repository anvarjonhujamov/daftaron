import { useState } from 'react'
import { Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { subscriptionApi } from '../api/subscription.api'
import { errorMessage } from '../lib/errors'
import { Card, Pill } from '../ui/display'
import { Button, Chips, cx } from '../ui/controls'
import { Confirm } from '../ui/Sheet'
import { formatMoney, formatNumber } from '../utils/format'
import { t, tk } from '../i18n'

// Paket turi: nomi (ro'yxatda) va soni bilan ("+50 SMS")
export const PACKAGE_UNITS = { sms: tk('SMS'), debt: tk('nasiya'), shop: tk("do'kon"), worker: tk('xodim'), supplier: tk("ta'minotchi") }
const PACKAGE_COUNTS = { sms: tk('+{n} SMS'), debt: tk('+{n} nasiya'), shop: tk("+{n} do'kon"), worker: tk('+{n} xodim'), supplier: tk("+{n} ta'minotchi") }
export const packageText = (type, n) => (PACKAGE_COUNTS[type] ? t(PACKAGE_COUNTS[type], { n }) : `+${n}`)

// Limit: null — cheksiz, 0 — yo'q (0 ni «cheksiz» deb ko'rsatmang)
const limit = (v, text, unlimited, none) => {
    if (v === null || v === undefined) return { ok: true, text: unlimited }
    if (Number(v) === 0) return { ok: false, text: none }
    return { ok: true, text: text(formatNumber(v)) }
}

// plans[].limits — backend haqiqatda qo'llaydigan limitlar (Pro'da nasiya bazada 0 bo'lsa ham cheksiz)
const features = (p) => {
    const l = p.limits || { debt: p.debt_limit, shop: p.shop_limit, worker: p.worker_limit, supplier: p.supplier_limit, sms: p.sms_limit }
    return [
        limit(l.debt, (n) => t('Oyiga {n} ta nasiya', { n }), t('Cheksiz nasiya'), t("Nasiya yozib bo'lmaydi")),
        limit(l.shop, (n) => t("{n} ta do'kon", { n }), t("Cheksiz do'kon"), t("Do'kon yo'q")),
        limit(l.worker, (n) => t('{n} ta xodim', { n }), t('Cheksiz xodim'), t("Xodim qo'shib bo'lmaydi")),
        limit(l.supplier, (n) => t("{n} ta ta'minotchi", { n }), t("Cheksiz ta'minotchi"), t("Ta'minotchi yo'q")),
        limit(l.sms, (n) => t('Oyiga {n} ta bepul SMS', { n }), t('Cheksiz SMS'), t("Bepul SMS yo'q")),
        { ok: p.allow_export !== false, text: t("Excel'ga yuklash") }
    ]
}

// Ta'riflar kartalari: limitlar, limitdan tashqari narxlar va tanlash (balansdan)
export default function PlanCards({ plans = [], currentPlanId, expired, balance, promoCode, canChoose = true, onChanged }) {
    const [months, setMonths] = useState(1)
    const [choose, setChoose] = useState(null)
    const priceOf = (p) => (months === 12 ? Number(p.yearly_price ?? p.price * 10) : Number(p.price))
    const hasActive = !!currentPlanId && !expired

    const doChoose = async () => {
        try {
            const r = await subscriptionApi.choose(choose.id, { months: months === 12 ? 12 : undefined, promo_code: promoCode || undefined })
            toast.success(r.message || t("Ta'rif faollashtirildi"))
            setChoose(null)
            onChanged?.()
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }

    const confirmText = () => {
        if (!choose) return ''
        const price = priceOf(choose)
        const parts = [t('Balansdan {amount} yechiladi ({period}).', { amount: formatMoney(price), period: months === 12 ? t('12 oy, 2 oy bepul') : t('1 oy') })]
        if (promoCode) parts.push(t("Promo kod qo'llanadi."))
        if (hasActive && choose.id !== currentPlanId) parts.push(t("Yangi ta'rif bugundan boshlanadi, joriy ta'rifning qolgan kunlari qo'shilmaydi."))
        parts.push(t('Balans: {amount}.', { amount: formatMoney(balance) }))
        if (!promoCode && Number(balance || 0) < price) parts.push(t("{amount} yetmaydi — avval balansni to'ldiring.", { amount: formatMoney(price - Number(balance || 0)) }))
        return parts.join(' ')
    }

    if (!plans.length) return null
    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="section-label">{t("Ta'riflar")}</h2>
                <Chips size="sm" ariaLabel={t('Muddat')} value={months} onChange={setMonths} wrap options={[{ value: 1, label: t('Oylik') }, { value: 12, label: t('Yillik · 2 oy bepul') }]} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((p) => {
                    const active = p.id === currentPlanId && !expired
                    const popular = /pro/i.test(p.name)
                    const packages = p.extra_packages || []
                    return (
                        <Card key={p.id} className={cx('flex flex-col p-5', active ? 'border-2 border-brand' : popular && 'border-2 border-line-2')}>
                            <div className="flex flex-wrap items-center gap-2">
                                <strong className="text-lg">{p.name}</strong>
                                {active ? <Pill tone="success">{t('Joriy')}</Pill> : popular && <Pill tone="info">{t('Eng ommabob')}</Pill>}
                            </div>
                            <div className="mt-2 text-[26px] font-extrabold">{formatNumber(priceOf(p))} <span className="text-sm font-semibold text-ink-2">{months === 12 ? t("so'm/yil") : t("so'm/oy")}</span></div>
                            {months === 12 && <p className="text-[13px] text-ink-2">{t("Oyiga {amount} so'm", { amount: formatNumber(Math.round(priceOf(p) / 12)) })}</p>}
                            <ul className="mt-3 space-y-1.5 text-[15px]">
                                {features(p).map((f) => (
                                    <li key={f.text} className={cx('flex items-center gap-2', f.ok ? 'text-ink-2' : 'text-ink-3')}>
                                        {f.ok ? <Check size={16} className="shrink-0 text-pay" aria-hidden /> : <X size={16} className="shrink-0" aria-hidden />}
                                        {f.ok ? f.text : <span className={f.text === t("Excel'ga yuklash") ? 'line-through' : ''}>{f.text}</span>}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-4 flex-1 rounded-xl bg-soft/70 p-3 text-sm">
                                <p className="mb-1.5 font-semibold">{t('Limitdan tashqari')}</p>
                                <ul className="space-y-1 text-ink-2">
                                    {p.sms_overage_price > 0 && <li className="flex justify-between gap-2"><span>{t('Bepul SMS tugagach')}</span><strong className="whitespace-nowrap text-ink">{t("{amount} so'm/SMS", { amount: formatNumber(p.sms_overage_price) })}</strong></li>}
                                    {packages.map((x) => (
                                        <li key={x.id} className="flex justify-between gap-2">
                                            <span>{packageText(x.resolved_type || x.feature_type || x.type, formatNumber(x.quantity))}</span>
                                            <strong className="whitespace-nowrap text-ink">{formatMoney(x.price)}</strong>
                                        </li>
                                    ))}
                                    {packages.length === 0 && <li>{t("Qo'shimcha paketlar yo'q")}</li>}
                                </ul>
                            </div>
                            <Button className="mt-4" variant={active ? 'secondary' : 'primary'} disabled={active || !canChoose} onClick={() => setChoose(p)}>
                                {active ? t("Faol ta'rif") : t("{name}ga o'tish", { name: p.name })}
                            </Button>
                        </Card>
                    )
                })}
            </div>
            <Confirm open={!!choose} onClose={() => setChoose(null)} onConfirm={doChoose} title={t("{name} ta'rifi", { name: choose?.name || '' })} confirmText={t('Tasdiqlash')} text={confirmText()} />
        </>
    )
}
