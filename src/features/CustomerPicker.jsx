import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { customersApi } from '../api/customers.api'
import { useDebounced, useResource } from '../lib/hooks'
import { errorMessage, fieldErrors } from '../lib/errors'
import { Avatar, Money, Row } from '../ui/display'
import { Button, Input, PhoneInput, cx } from '../ui/controls'
import { formatPhone, isValidPhone, toApiPhone } from '../utils/phone'

// Mijoz tanlash: qidiruv (ism, raqam yoki oxirgi 4 xona), oxirgi mijozlar va «+ Yangi» (ism + telefon)
export default function CustomerPicker({ onSelect, withDebt, allowCreate = true }) {
    const [q, setQ] = useState('')
    const [creating, setCreating] = useState(false)
    const query = useDebounced(q.trim(), 250)

    const { data, loading } = useResource(
        () => customersApi.list({ q: query || undefined, sort: query ? 'name' : 'last_activity', with_debt: withDebt ? 1 : undefined, per_page: query ? 12 : 8 }),
        [query, withDebt]
    )
    const list = data?.data || []

    if (creating) return <QuickCustomerForm initialName={/\d/.test(q) ? '' : q} initialPhone={/\d/.test(q) ? q : ''} onCancel={() => setCreating(false)} onCreated={onSelect} />

    return (
        <div>
            <label className="flex h-12 items-center gap-2.5 rounded-ctl border-[1.5px] border-line-2 bg-card px-3.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
                <Search size={20} className="shrink-0 text-ink-3" aria-hidden />
                <input
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Kimga? Ism yoki telefon"
                    aria-label="Mijozni qidirish"
                    className="w-full min-w-0 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
                />
            </label>
            <p className="mb-1 mt-3 section-label">{query ? 'Topilganlar' : 'Oxirgi mijozlar'}</p>
            <div className={cx('-mx-3.5 divide-y divide-line', loading && !list.length && 'opacity-60')}>
                {list.map((c) => (
                    <Row
                        key={c.id}
                        onClick={() => onSelect(c)}
                        left={<Avatar name={c.name} size={36} />}
                        title={c.name}
                        subtitle={formatPhone(c.phone)}
                        right={c.total_debt > 0 && <Money value={c.total_debt} tone="debt" className="text-[15px]" />}
                    />
                ))}
                {!loading && !list.length && <p className="px-3.5 py-4 text-[15px] text-ink-2">{query ? 'Mijoz topilmadi.' : "Hali mijoz yo'q."}</p>}
            </div>
            {allowCreate && (
                <Button variant="ghost" icon={Plus} className="mt-2 w-full border-[1.5px] border-dashed border-brand" onClick={() => setCreating(true)}>
                    Yangi mijoz
                </Button>
            )}
        </div>
    )
}

// Yangi mijoz: faqat ism va telefon. Takror raqam bo'lsa — mavjud mijozni taklif qiladi
export function QuickCustomerForm({ initialName = '', initialPhone = '', onCreated, onCancel }) {
    const [name, setName] = useState(initialName)
    const [phone, setPhone] = useState(initialPhone.replace(/\D/g, ''))
    const [errors, setErrors] = useState({})
    const [existing, setExisting] = useState(null)
    const [saving, setSaving] = useState(false)

    const submit = async () => {
        const errs = {}
        if (!name.trim()) errs.name = 'Ismni kiriting'
        if (!isValidPhone(phone)) errs.phone = "Raqam to'liq emas: 9 ta raqam"
        setErrors(errs)
        if (Object.keys(errs).length) return
        setSaving(true)
        try {
            const res = await customersApi.create({ name: name.trim(), phone: toApiPhone(phone) })
            onCreated(res.customer || res.data || res)
        } catch (err) {
            const ex = err?.response?.data?.existing_customer
            if (ex) setExisting(ex)
            else if (err?.response?.status === 422) setErrors(fieldErrors(err))
            else toast.error(errorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-4" onKeyDown={(e) => e.key === 'Enter' && e.target.tagName === 'INPUT' && (e.preventDefault(), submit())}>
            <Input label="Ismi" required autoFocus value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={255} />
            <PhoneInput label="Telefon" required value={phone} onChange={setPhone} error={errors.phone} hint="Raqam o'zi 90 123 45 67 ko'rinishiga keladi." />
            {existing && (
                <div role="alert" className="rounded-ctl bg-warn-soft p-3.5 text-[15px] text-ink">
                    Bu raqam bilan mijoz bor: <strong>{existing.name}</strong>.
                    <Button size="sm" className="mt-2 w-full" onClick={() => onCreated(existing)}>Shu mijozni tanlash</Button>
                </div>
            )}
            <div className="flex gap-2">
                {onCancel && <Button variant="secondary" size="lg" className="flex-1" onClick={onCancel}>Orqaga</Button>}
                <Button size="lg" className="flex-1" loading={saving} onClick={submit}>Saqlash</Button>
            </div>
        </div>
    )
}
