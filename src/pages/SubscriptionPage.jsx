import { useState } from 'react'
import { Check, Copy, Gift } from 'lucide-react'
import toast from 'react-hot-toast'
import { subscriptionApi } from '../api/subscription.api'
import { useSession } from '../app/session'
import { useResource } from '../lib/hooks'
import { errorMessage } from '../lib/errors'
import TopUpSheet, { ProviderButtons } from '../features/TopUpSheet'
import { Card, List, Money, PageHeader, Pill, Row, SectionTitle, Skeleton } from '../ui/display'
import { Button, Chips, Input, Toggle, cx } from '../ui/controls'
import { Confirm } from '../ui/Sheet'
import { formatDate } from '../utils/date'
import { formatMoney, formatNumber } from '../utils/format'

const limitText = (v, unit) => (v === null || v === undefined || v === 0 ? `Cheksiz ${unit}` : `${formatNumber(v)} ${unit}`)
const TX_TYPES = { subscription: 'Obuna', deposit: "Balans to'ldirildi", sms: 'SMS', extra: "Qo'shimcha paket", referral: 'Referal bonusi', promo: 'Promo' }
const PACKAGE_UNITS = { sms: 'SMS', debt: 'nasiya', shop: "do'kon", worker: 'xodim' }

export default function SubscriptionPage() {
    const session = useSession()
    const status = useResource(() => subscriptionApi.status(), [], { cacheKey: 'subscription_status' })
    const tx = useResource(() => subscriptionApi.transactions(), [])
    const [months, setMonths] = useState(1)
    const [provider, setProvider] = useState(null)
    const [choose, setChoose] = useState(null)
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
    const plans = s.plans || []
    const currentPlan = plans.find((p) => p.id === s.current_plan_id)
    const shortfall = currentPlan ? Number(currentPlan.price) - Number(s.balance || 0) : 0
    const packages = (s.extra_packages || []).filter((p) => p.is_active !== false && (usage.allowed_extra_package_types || []).includes(p.feature_type || p.type))
    const priceOf = (p) => (months === 12 ? Number(p.yearly_price ?? p.price * 10) : Number(p.price))

    const refresh = () => { status.reload(); tx.reload(); session.refresh() }

    const doChoose = async () => {
        try {
            const r = await subscriptionApi.choose(choose.id, { months: months === 12 ? 12 : undefined, promo_code: promoInfo?.valid ? promo.trim() : undefined })
            toast.success(r.message || "Ta'rif faollashtirildi")
            setChoose(null)
            refresh()
        } catch (err) {
            toast.error(errorMessage(err))
        }
    }
    const doBuy = async () => {
        try {
            const r = await subscriptionApi.buyExtra(buy.id)
            toast.success(r.message || 'Paket sotib olindi')
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
            setPromoInfo({ valid: r.valid !== false, message: r.message || "Promo kod qabul qilindi — ta'rif tanlanganda qo'llanadi" })
        } catch (err) {
            setPromoInfo({ valid: false, message: errorMessage(err, "Promo kod noto'g'ri") })
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
            <PageHeader back title="Ta'rif va balans" />
            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <div className="text-sm text-ink-2">Obuna holati</div>
                    <div className="mt-1 flex items-center gap-2">
                        <span className="text-2xl font-extrabold">{usage.plan_name || 'Sinov muddati'}</span>
                        <Pill tone={expired ? 'danger' : 'success'}>{expired ? 'Tugagan' : 'Faol'}</Pill>
                    </div>
                    <p className="mt-1 text-[15px] text-ink-2">{formatDate(trial.trial_ends_at)} gacha{!expired && trial.days_remaining !== undefined && ` · ${trial.days_remaining} kun qoldi`}</p>
                    {expired && <p className="mt-2 rounded-xl bg-debt-soft p-3 text-sm font-semibold text-debt">Obuna tugagan: ma'lumotlar saqlanadi, faqat ko'rish mumkin. Ta'rif tanlang.</p>}
                    <Toggle className="mt-4" checked={autoRenew} onChange={toggleAuto} label="Balansdan avtomatik uzaytirish" description="Muddat tugash kuni balans yetsa, joriy ta'rif 30 kunga uzaytiriladi" />
                </Card>
                <Card className="p-5">
                    <div className="text-sm text-ink-2">Joriy balans</div>
                    <Money value={s.balance} suffix className="text-[30px]" />
                    {shortfall > 0 && <p className="mt-1 text-sm font-semibold text-warn">Keyingi oy uchun {formatMoney(shortfall)} yetmaydi</p>}
                    <ProviderButtons className="mt-4" onSelect={setProvider} />
                </Card>
            </div>

            <SectionTitle>Qoldiqlar</SectionTitle>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
                {[
                    ['SMS', usage.sms_remaining === null || usage.sms_remaining === undefined ? '—' : `${formatNumber(usage.sms_remaining)} ta`],
                    ['Nasiya yozish', usage.debt_remaining === null || usage.debt_remaining === undefined ? 'Cheksiz' : `${formatNumber(usage.debt_remaining)} ta`],
                    ["Do'konlar", `${formatNumber(usage.shop_used)} / ${usage.shop_total_limit ? formatNumber(usage.shop_total_limit) : '∞'}`],
                    ['Xodimlar', `${formatNumber(usage.worker_used)} / ${usage.worker_total_limit ? formatNumber(usage.worker_total_limit) : '∞'}`]
                ].map(([k, v]) => <Card key={k} className="p-4"><div className="text-[13px] text-ink-2">{k}</div><div className="text-lg font-extrabold">{v}</div></Card>)}
            </div>
            {packages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {packages.map((p) => (
                        <Button key={p.id} variant="secondary" size="sm" onClick={() => setBuy(p)}>
                            +{formatNumber(p.quantity)} {PACKAGE_UNITS[p.feature_type || p.type] || ''} · {formatNumber(p.price)} so'm
                        </Button>
                    ))}
                </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="section-label">Ta'riflar</h2>
                <Chips size="sm" ariaLabel="Muddat" value={months} onChange={setMonths} wrap options={[{ value: 1, label: 'Oylik' }, { value: 12, label: 'Yillik · 2 oy bepul' }]} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
                {plans.map((p) => {
                    const active = p.id === s.current_plan_id && !expired
                    const popular = /pro/i.test(p.name)
                    return (
                        <Card key={p.id} className={cx('flex flex-col p-5', active ? 'border-2 border-brand' : popular && 'border-2 border-line-2')}>
                            <div className="flex items-center gap-2">
                                <strong className="text-lg">{p.name}</strong>
                                {popular && <Pill tone="info">Eng ommabob</Pill>}
                            </div>
                            <div className="mt-2 text-[26px] font-extrabold">{formatNumber(priceOf(p))} <span className="text-sm font-semibold text-ink-2">so'm/{months === 12 ? 'yil' : 'oy'}</span></div>
                            <ul className="mt-3 flex-1 space-y-1.5 text-[15px] text-ink-2">
                                {[limitText(p.shop_limit, "do'kon"), limitText(p.worker_limit, 'xodim'), limitText(p.debt_limit, 'nasiya'), `${formatNumber(p.sms_limit)} SMS/oy`, p.allow_export === true && "Excel'ga yuklash"].filter(Boolean).map((t) => (
                                    <li key={t} className="flex items-center gap-2"><Check size={16} className="text-pay" aria-hidden />{t}</li>
                                ))}
                            </ul>
                            <Button className="mt-4" variant={active ? 'secondary' : 'primary'} disabled={active || session.isOwner === false} onClick={() => setChoose(p)}>
                                {active ? "Faol ta'rif" : `${p.name}ga o'tish`}
                            </Button>
                        </Card>
                    )
                })}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <Card className="p-5">
                    <p className="mb-2 section-label">Promo kod</p>
                    <div className="flex gap-2">
                        <Input size="md" className="flex-1" aria-label="Promo kod" placeholder="Masalan: DOKON2026" value={promo} onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoInfo(null) }} />
                        <Button variant="secondary" loading={checking} onClick={checkPromo} className="h-11">Qo'llash</Button>
                    </div>
                    {promoInfo && <p className={cx('mt-2 text-sm font-semibold', promoInfo.valid ? 'text-pay' : 'text-debt')}>{promoInfo.message}</p>}
                </Card>
                {referral && (
                    <Card className="p-5">
                        <p className="flex items-center gap-2 font-bold"><Gift size={18} className="text-brand-strong" aria-hidden />Do'stingizni taklif qiling — ikkalangizga 1 oy bepul</p>
                        <p className="mt-1 text-sm text-ink-2">Do'stingiz ro'yxatdan o'tib, birinchi pullik obunani olganda.</p>
                        <div className="mt-3 flex items-center gap-2">
                            <code className="flex-1 rounded-xl bg-soft px-3 py-2.5 text-lg font-bold tracking-widest">{referral}</code>
                            <Button variant="secondary" icon={Copy} onClick={() => navigator.clipboard?.writeText(referral).then(() => toast.success('Nusxa olindi'))}>Nusxa</Button>
                        </div>
                    </Card>
                )}
            </div>

            <SectionTitle>So'nggi tranzaksiyalar</SectionTitle>
            {(tx.data?.data || []).length === 0 ? <Card className="p-4 text-[15px] text-ink-2">{tx.loading ? 'Yuklanmoqda…' : "Tranzaksiya yo'q."}</Card> : (
                <List>
                    {tx.data.data.map((t) => (
                        <Row key={t.id} title={t.description || TX_TYPES[t.type] || t.type} subtitle={formatDate(t.created_at)}
                            right={<Money value={Math.abs(t.amount)} sign={t.amount < 0 ? '−' : '+'} tone={t.amount < 0 ? 'ink' : 'pay'} className="text-[15px]" />} />
                    ))}
                </List>
            )}

            <TopUpSheet open={!!provider} provider={provider} user={session.user} suggested={shortfall} onClose={() => setProvider(null)} />
            <Confirm open={!!choose} onClose={() => setChoose(null)} onConfirm={doChoose} title={`${choose?.name || ''} ta'rifi`} confirmText="Tasdiqlash"
                text={choose && `Balansdan ${formatMoney(priceOf(choose))} yechiladi (${months === 12 ? '12 oy, 2 oy bepul' : '1 oy'}).${promoInfo?.valid ? ' Promo kod qo\'llanadi.' : ''} Balans: ${formatMoney(s.balance)}.`} />
            <Confirm open={!!buy} onClose={() => setBuy(null)} onConfirm={doBuy} title="Qo'shimcha paket" confirmText="Sotib olish"
                text={buy && `+${formatNumber(buy.quantity)} ${PACKAGE_UNITS[buy.feature_type || buy.type] || ''} — balansdan ${formatMoney(buy.price)} yechiladi.`} />
        </div>
    )
}
