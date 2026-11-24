import { useState } from 'react'
import { Copy, Gift, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { subscriptionApi } from '../api/subscription.api'
import { useSession } from '../app/session'
import { useResource } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import TopUpSheet, { ProviderButtons } from '../features/TopUpSheet'
import PlanCards, { packageText } from '../features/PlanCards'
import TrialFeatures from '../features/TrialFeatures'
import { Card, List, Money, PageHeader, Pill, Row, SectionTitle, Skeleton } from '../ui/display'
import { Button, Input, Toggle, cx } from '../ui/controls'
import { Confirm } from '../ui/Sheet'
import { formatDate } from '../utils/date'
import { formatMoney, formatNumber, planLabel } from '../utils/format'
import { t, tk } from '../i18n'

// Qoldiq: null — cheksiz (∞), 0 — haqiqiy nol
const ofLimit = (used, total) => `${formatNumber(used)} / ${total === null || total === undefined ? '∞' : formatNumber(total)}`
const TX_TYPES = { subscription: tk('Obuna'), deposit: tk("Balans to'ldirildi"), sms: 'SMS', extra: tk("Qo'shimcha paket"), referral: tk('Referal bonusi'), promo: tk('Promo') }

export default function SubscriptionPage() {
    const session = useSession()
    const status = useResource(() => subscriptionApi.status(), [], { cacheKey: 'subscription_status' })
    const tx = useResource(() => subscriptionApi.transactions(), [])
    const [provider, setProvider] = useState(null)
    const [buy, setBuy] = useState(null)
    const [promo, setPromo] = useState('')
    const [promoInfo, setPromoInfo] = useState(null)
    const [checking, setChecking] = useState(false)
    const [autoRenew, setAutoRenew] = useState(() => session.user?.auto_renew ?? false)

    const s = status.data
    if (!s) return <div className="page space-y-3"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-40" /><Skeleton className="h-64" /></div>

    const usage = s.usage || {}
    const trial = s.trial_info || {}
    const expired = trial.is_expired || usage.subscription_status === 'expired'
    // Bepul sinov tugagan, ta'rif olinmagan: ilovada faqat shu sahifa ochiq (Layout)
    const trialExpired = !!(s.trial_expired ?? session.trialExpired)
    const plans = s.plans || []
    const currentPlan = plans.find((p) => p.id === s.current_plan_id)
    const shortfall = currentPlan ? Number(currentPlan.price) - Number(s.balance || 0) : 0
    const packages = (s.extra_packages || []).filter((p) => p.is_active !== false && (usage.allowed_extra_package_types || []).includes(p.feature_type || p.type))

    const refresh = () => { status.reload(); tx.reload(); session.refresh() }

    const doBuy = async () => {
        try {
            const r = await subscriptionApi.buyExtra(buy.id)
            toast.success(r.message || t('Paket sotib olindi'))
            setBuy(null)
            refresh()
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }
    const checkPromo = async () => {
        if (!promo.trim()) return
        setChecking(true)
        try {
            const r = await subscriptionApi.checkPromo(promo.trim())
            setPromoInfo({ valid: r.valid !== false, message: r.message || t("Promo kod qabul qilindi — ta'rif tanlanganda qo'llanadi") })
        } catch (err) {
            setPromoInfo({ valid: false, message: errorMessage(err, t("Promo kod noto'g'ri")) })
        } finally {
            setChecking(false)
        }
    }
    const toggleAuto = async (v) => {
        setAutoRenew(v)
        try { await subscriptionApi.setAutoRenew(v) } catch (err) { setAutoRenew(!v); toast.error(errorMessage(err)) }
    }

    const referral = session.user?.referral_code
    return (
        <div className="page">
            <PageHeader back={!trialExpired} title={t("Ta'rif va balans")} />
            {trialExpired && (
                <Card className="mb-4 flex items-start gap-3 border-debt/30 bg-debt-soft p-5">
                    <Lock size={22} className="mt-0.5 shrink-0 text-debt" aria-hidden />
                    <div>
                        <p className="text-lg font-extrabold text-debt">{t('Bepul sinov muddati tugadi')}</p>
                        <p className="mt-1 text-[15px] text-ink">
                            {t("Mijozlar, nasiyalar va to'lovlar saqlangan, lekin ta'rif olinmaguncha ko'rinmaydi.")}{' '}
                            {session.isOwner !== false ? t("Ta'rif tanlang — hammasi darhol qaytadi.") : t("Do'kon egasi ta'rif olgach, hammasi qaytadi.")}
                        </p>
                        {trial.trial_ends_at && <p className="mt-1 text-sm text-ink-2">{t('Sinov {date} da tugagan', { date: formatDate(trial.trial_ends_at) })}</p>}
                    </div>
                </Card>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <div className="text-sm text-ink-2">{t('Obuna holati')}</div>
                    <div className="mt-1 flex items-center gap-2">
                        <span className="text-2xl font-extrabold">{planLabel(usage)}</span>
                        <Pill tone={expired ? 'danger' : 'success'}>{expired ? t('Tugagan') : t('Faol')}</Pill>
                    </div>
                    <p className="mt-1 text-[15px] text-ink-2">{t('{date} gacha', { date: formatDate(trial.trial_ends_at) })}{!expired && trial.days_remaining !== undefined && ` · ${t('{n} kun qoldi', { n: trial.days_remaining })}`}</p>
                    {expired && !trialExpired && <p className="mt-2 rounded-xl bg-debt-soft p-3 text-sm font-semibold text-debt">{t("Obuna tugagan: ma'lumotlar saqlanadi, faqat ko'rish mumkin. Ta'rif tanlang.")}</p>}
                    {usage.is_trial && !expired && usage.debt_remaining === 0 && (
                        <p className="mt-2 rounded-xl bg-debt-soft p-3 text-sm font-semibold text-debt">
                            {t("Sinovdagi {n} ta nasiya limiti tugadi. Yangi nasiya yozish uchun ta'rif tanlang.", { n: formatNumber(usage.debt_total_limit) })}
                        </p>
                    )}
                    <Toggle className="mt-4" checked={autoRenew} onChange={toggleAuto} label={t('Balansdan avtomatik uzaytirish')} description={t("Muddat tugash kuni balans yetsa, joriy ta'rif 30 kunga uzaytiriladi")} />
                </Card>
                <Card className="p-5">
                    <div className="text-sm text-ink-2">{t('Joriy balans')}</div>
                    <Money value={s.balance} suffix className="text-[30px]" />
                    {shortfall > 0 && <p className="mt-1 text-sm font-semibold text-warn">{t('Keyingi oy uchun {amount} yetmaydi', { amount: formatMoney(shortfall) })}</p>}
                    <ProviderButtons className="mt-4" onSelect={setProvider} enabled={s?.top_up_providers} />
                </Card>
            </div>

            <SectionTitle>{t('Qoldiqlar')}</SectionTitle>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
                {[
                    [t('Bepul SMS'), usage.sms_remaining === null || usage.sms_remaining === undefined ? '—' : `${formatNumber(usage.sms_remaining)} / ${formatNumber(usage.sms_total_limit)}`,
                        usage.sms_overage_allowed === false ? t("Keyin SMS yuborilmaydi") : usage.extra_sms_price > 0 && t('Keyin {price}/SMS balansdan', { price: formatMoney(usage.extra_sms_price) })],
                    [t('Nasiya yozish'), usage.debt_remaining === null || usage.debt_remaining === undefined ? t('Cheksiz') : `${formatNumber(usage.debt_remaining)} / ${formatNumber(usage.debt_total_limit)}`,
                        usage.debt_remaining === 0 && (usage.is_trial ? t('Obuna olish kerak') : t('Limit tugagan'))],
                    [t("Do'konlar"), ofLimit(usage.shop_used, usage.shop_total_limit)],
                    [t('Xodimlar'), ofLimit(usage.worker_used, usage.worker_total_limit)]
                ].map(([k, v, note]) => (
                    <Card key={k} className="p-4">
                        <div className="text-[13px] text-ink-2">{k}</div>
                        <div className="text-lg font-extrabold">{v}</div>
                        {note && <div className="mt-0.5 text-xs text-ink-2">{note}</div>}
                    </Card>
                ))}
            </div>
            {usage.is_trial && usage.trial && (
                <Card className="mt-3 p-5">
                    <p className="font-bold">{t('Bepul sinovda nimalar bor')}</p>
                    <p className="mt-0.5 text-sm text-ink-2">{usage.trial.days > 0 ? `${t('{n} kun davomida.', { n: formatNumber(usage.trial.days) })} ` : ''}{t("Ta'rif olsangiz, uning limitlari ishlaydi.")}</p>
                    <TrialFeatures trial={usage.trial} className="mt-3 sm:columns-2" />
                </Card>
            )}
            {packages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {packages.map((p) => (
                        <Button key={p.id} variant="secondary" size="sm" onClick={() => setBuy(p)}>
                            {packageText(p.feature_type || p.type, formatNumber(p.quantity))} · {formatMoney(p.price)}
                        </Button>
                    ))}
                </div>
            )}

            <div className="mt-6">
                <PlanCards plans={plans} currentPlanId={s.current_plan_id} expired={expired} balance={s.balance} promoCode={promoInfo?.valid ? promo.trim() : undefined}
                    canChoose={session.isOwner !== false} onChanged={refresh} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <p className="mb-2 section-label">{t('Promo kod')}</p>
                    <div className="flex gap-2">
                        <Input size="md" className="flex-1" aria-label={t('Promo kod')} placeholder={t('Masalan: DOKON2026')} value={promo} onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoInfo(null) }} />
                        <Button variant="secondary" loading={checking} onClick={checkPromo} className="h-11">{t("Qo'llash")}</Button>
                    </div>
                    {promoInfo && <p className={cx('mt-2 text-sm font-semibold', promoInfo.valid ? 'text-pay' : 'text-debt')}>{promoInfo.message}</p>}
                </Card>
                {referral && (
                    <Card className="p-5">
                        <p className="flex items-center gap-2 font-bold"><Gift size={18} className="text-brand-strong" aria-hidden />{t("Do'stingizni taklif qiling — ikkalangizga 1 oy bepul")}</p>
                        <p className="mt-1 text-sm text-ink-2">{t("Do'stingiz ro'yxatdan o'tib, birinchi pullik obunani olganda.")}</p>
                        <div className="mt-3 flex items-center gap-2">
                            <code className="flex-1 rounded-xl bg-soft px-3 py-2.5 text-lg font-bold tracking-widest">{referral}</code>
                            <Button variant="secondary" icon={Copy} onClick={() => navigator.clipboard?.writeText(referral).then(() => toast.success(t('Nusxa olindi')))}>{t('Nusxa')}</Button>
                        </div>
                    </Card>
                )}
            </div>

            <SectionTitle>{t("So'nggi tranzaksiyalar")}</SectionTitle>
            {(tx.data?.data || []).length === 0 ? <Card className="p-4 text-[15px] text-ink-2">{tx.loading ? t('Yuklanmoqda…') : t("Tranzaksiya yo'q.")}</Card> : (
                <List>
                    {tx.data.data.map((row) => (
                        <Row key={row.id} title={row.description || t(TX_TYPES[row.type]) || row.type} subtitle={formatDate(row.created_at)}
                            right={<Money value={Math.abs(row.amount)} sign={row.amount < 0 ? '−' : '+'} tone={row.amount < 0 ? 'ink' : 'pay'} className="text-[15px]" />} />
                    ))}
                </List>
            )}

            <TopUpSheet open={!!provider} provider={provider} user={session.user} suggested={shortfall} enabled={s?.top_up_providers} onClose={() => setProvider(null)} />
            <Confirm open={!!buy} onClose={() => setBuy(null)} onConfirm={doBuy} title={t("Qo'shimcha paket")} confirmText={t('Sotib olish')}
                text={buy && t('{package} — balansdan {amount} yechiladi.', { package: packageText(buy.feature_type || buy.type, formatNumber(buy.quantity)), amount: formatMoney(buy.price) })} />
        </div>
    )
}
