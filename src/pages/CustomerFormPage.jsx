import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { customersApi } from '../api/customers.api'
import { useSession } from '../app/session'
import { useActions } from '../app/actions'
import { emitChange } from '../lib/hooks'
import { errorMessage, fieldErrors } from '../lib/errors'
import LocationFields from '../features/LocationFields'
import { Card, PageHeader, Skeleton } from '../ui/display'
import { Button, Input, MoneyInput, PhoneInput, TextArea, cx } from '../ui/controls'
import { Confirm } from '../ui/Sheet'
import { isValidPhone, phoneDigits, toApiPhone } from '../utils/phone'

const EMPTY = { name: '', phone: '', address: '', note: '', credit_limit: 0, region_id: null, district_id: null, street_id: null }

// Mijoz qo'shish va tahrirlash. Majburiy: ism, telefon; «Batafsil» — manzil, limit, izoh
export default function CustomerFormPage() {
    const { id } = useParams()
    const editing = !!id
    const navigate = useNavigate()
    const session = useSession()
    const actions = useActions()
    const [form, setForm] = useState(EMPTY)
    const [more, setMore] = useState(false)
    const [loading, setLoading] = useState(editing)
    const [saving, setSaving] = useState(null)
    const [errors, setErrors] = useState({})
    const [existing, setExisting] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(false)

    useEffect(() => {
        if (!editing) return
        customersApi.get(id)
            .then((c) => {
                setForm({
                    name: c.name || '', phone: phoneDigits(c.phone), address: c.address || '', note: c.note || '',
                    credit_limit: c.credit_limit ? Number(c.credit_limit) : 0,
                    region_id: c.region_id || null, district_id: c.district_id || null, street_id: c.street_id || null
                })
                setMore(!!(c.address || c.note || c.credit_limit || c.region_id))
            })
            .catch((err) => toast.error(errorMessage(err)))
            .finally(() => setLoading(false))
    }, [id, editing])

    const set = (patch) => { setForm((f) => ({ ...f, ...patch })); setErrors({}); setExisting(null) }

    const save = async (andDebt) => {
        const errs = {}
        if (!form.name.trim()) errs.name = 'Ismni kiriting'
        if (!isValidPhone(form.phone)) errs.phone = "Raqam to'liq emas: 9 ta raqam"
        setErrors(errs)
        if (Object.keys(errs).length) return
        setSaving(andDebt ? 'debt' : 'save')
        const payload = {
            name: form.name.trim(),
            phone: toApiPhone(form.phone),
            address_text: form.address.trim() || null,
            note: form.note.trim() || null,
            credit_limit: form.credit_limit > 0 ? form.credit_limit : null,
            region_id: form.region_id,
            district_id: form.district_id,
            mfy_id: form.street_id
        }
        try {
            const res = editing ? await customersApi.update(id, payload) : await customersApi.create(payload)
            const c = res.customer || res.data || res
            emitChange('customers')
            toast.success(editing ? 'Saqlandi' : "Mijoz qo'shildi")
            navigate(`/customers/${c.id || id}`, { replace: true })
            if (andDebt) actions.openDebt({ customer: c })
        } catch (err) {
            const d = err?.response?.data
            if (d?.existing_customer) setExisting(d.existing_customer)
            else if (err?.response?.status === 422) setErrors(fieldErrors(err))
            else toast.error(errorMessage(err))
        } finally {
            setSaving(null)
        }
    }

    const remove = async () => {
        try {
            await customersApi.remove(id)
            emitChange('customers')
            toast.success("Mijoz o'chirildi")
            navigate('/customers', { replace: true })
        } catch (err) {
            toast.error(errorMessage(err))
            setConfirmDelete(false)
        }
    }

    return (
        <div className="page md:max-w-2xl">
            <PageHeader back title={editing ? 'Mijozni tahrirlash' : 'Yangi mijoz'} />
            {loading ? <Skeleton className="h-64" /> : (
                <form noValidate onSubmit={(e) => { e.preventDefault(); save(false) }}>
                    <Card className="space-y-4 p-4 md:p-6">
                        <Input label="Ismi" required value={form.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} autoFocus={!editing} maxLength={255} />
                        <PhoneInput label="Telefon" required value={form.phone} onChange={(v) => set({ phone: v })} error={errors.phone} />
                        {existing && (
                            <div role="alert" className="rounded-ctl bg-warn-soft p-3.5 text-[15px]">
                                Bu raqam bilan mijoz bor: <strong>{existing.name}</strong>.{' '}
                                <Link to={`/customers/${existing.id}`} className="font-bold text-brand-strong">Uni ochish</Link>
                            </div>
                        )}
                        <button type="button" aria-expanded={more} onClick={() => setMore(!more)}
                            className="flex h-[52px] w-full items-center justify-between rounded-ctl bg-soft px-4 text-left text-[15px] font-semibold">
                            <span>Batafsil <span className="font-normal text-ink-2">— manzil, limit, izoh (ixtiyoriy)</span></span>
                            <ChevronDown size={20} className={cx('text-ink-2 transition-transform', more && 'rotate-180')} aria-hidden />
                        </button>
                        {more && (
                            <div className="space-y-4">
                                <LocationFields value={form} onChange={(loc) => set(loc)} errors={errors} />
                                <Input size="md" label="To'liq manzil" placeholder="Masalan: Yangi bozor, 3-qator" value={form.address} onChange={(e) => set({ address: e.target.value })} error={errors.address_text} maxLength={500} />
                                <MoneyInput label="Nasiya limiti" placeholder="Cheksiz" value={form.credit_limit} onChange={(v) => set({ credit_limit: v })}
                                    hint="Bo'sh qoldirilsa — cheksiz. Limitdan oshganda ogohlantiriladi." error={errors.credit_limit} />
                                <TextArea label="Izoh" value={form.note} onChange={(e) => set({ note: e.target.value })} placeholder="Masalan: har juma to'laydi" maxLength={1000} rows={2} />
                            </div>
                        )}
                    </Card>
                    <div className="mt-4 flex flex-col gap-2.5 md:flex-row-reverse">
                        {!editing && session.can('debt.create') && (
                            <Button size="lg" className="md:flex-1" loading={saving === 'debt'} disabled={!!saving} onClick={() => save(true)}>Saqlash va nasiya yozish</Button>
                        )}
                        <Button type="submit" size="lg" variant={editing ? 'primary' : 'secondary'} className="md:flex-1" loading={saving === 'save'} disabled={!!saving}>
                            {editing ? 'Saqlash' : 'Faqat saqlash'}
                        </Button>
                    </div>
                    {editing && session.can('customer.edit') && (
                        <Button variant="danger-ghost" icon={Trash2} className="mt-6" onClick={() => setConfirmDelete(true)}>Mijozni o'chirish</Button>
                    )}
                </form>
            )}
            <Confirm open={confirmDelete} onClose={() => setConfirmDelete(false)} onConfirm={remove} danger title="Mijozni o'chirish"
                text="Mijoz va uning barcha nasiya hamda to'lovlari o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi." confirmText="O'chirish" />
        </div>
    )
}
