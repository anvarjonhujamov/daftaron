import { useEffect, useRef, useState } from 'react'
import { Paperclip, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { suppliersApi } from '../api/suppliers.api'
import { emitChange } from '../lib/hooks'
import { errorMessage, fieldErrors } from '../lib/errors'
import { Sheet } from '../ui/Sheet'
import { Button, Chips, Input, MoneyInput, PhoneInput, TextArea } from '../ui/controls'
import { todayYmd } from '../utils/date'
import { formatMoney, formatNumber } from '../utils/format'
import { phoneDigits, isValidPhone, toApiPhone } from '../utils/phone'

const MAX_FILES = 5
const MAX_SIZE = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

export const SUPPLIER_METHODS = { credit: 'nasiyaga', cash: 'naqd', transfer: "o'tkazma" }

// Xarid (mol oldim) yoki to'lov (to'lov qildim)
export function SupplierTxSheet({ open, onClose, supplier, initialType = 'debt' }) {
    const today = todayYmd()
    const [type, setType] = useState(initialType)
    const [amount, setAmount] = useState(0)
    const [method, setMethod] = useState('credit')
    const [date, setDate] = useState(today)
    const [due, setDue] = useState('')
    const [doc, setDoc] = useState('')
    const [note, setNote] = useState('')
    const [files, setFiles] = useState([])
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)
    const fileRef = useRef(null)

    useEffect(() => {
        if (!open) return
        setType(initialType)
        setAmount(0)
        setMethod(initialType === 'debt' ? 'credit' : 'cash')
        setDate(today)
        setDue('')
        setDoc('')
        setNote('')
        setFiles([])
        setErrors({})
    }, [open, initialType, today])

    const addFiles = (list) => {
        const picked = [...list]
        const tooBig = picked.find((f) => f.size > MAX_SIZE)
        if (tooBig) toast.error(`${tooBig.name}: 5 MB dan katta`)
        setFiles((prev) => [...prev, ...picked.filter((f) => f.size <= MAX_SIZE)].slice(0, MAX_FILES))
    }

    const debt = Number(supplier?.current_debt || 0)
    const submit = async () => {
        if (!(amount > 0)) return setErrors({ amount: 'Summani kiriting' })
        if (type === 'payment' && amount > debt) return setErrors({ amount: `Qarzimizdan (${formatNumber(debt)}) ko'p to'lab bo'lmaydi` })
        setBusy(true)
        const payload = {
            amount, transaction_date: date, payment_method: method, doc_number: doc.trim() || undefined,
            description: note.trim() || undefined, attachments: files, due_date: type === 'debt' ? due || undefined : undefined
        }
        try {
            if (type === 'debt') await suppliersApi.addPurchase(supplier.id, payload)
            else await suppliersApi.addPayment(supplier.id, payload)
            toast.success(type === 'debt' ? 'Xarid saqlandi' : "To'lov saqlandi")
            emitChange('suppliers')
            onClose()
        } catch (err) {
            if (err?.response?.status === 422 && err.response.data?.errors) setErrors(fieldErrors(err))
            else toast.error(errorMessage(err))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Sheet open={open} onClose={onClose} title={supplier?.name || "Ta'minotchi"} subtitle={`Bizning qarzimiz: ${formatMoney(debt)}`} onSubmit={submit}
            footer={<Button type="submit" variant={type === 'debt' ? 'primary' : 'pay'} size="lg" block loading={busy}>
                {type === 'debt' ? 'Xaridni saqlash' : "To'lovni saqlash"}{amount > 0 && ` — ${formatMoney(amount)}`}
            </Button>}>
            <div className="space-y-4">
                <Chips ariaLabel="Turi" value={type} onChange={(v) => { setType(v); setMethod(v === 'debt' ? 'credit' : 'cash'); setErrors({}) }}
                    options={[{ value: 'debt', label: 'Xarid (mol oldim)' }, { value: 'payment', label: "To'lov qildim" }]} />
                <MoneyInput label="Summa" value={amount} onChange={(v) => { setAmount(v); setErrors({}) }} error={errors.amount} autoFocus big />
                <div>
                    <p className="mb-2 text-sm font-semibold">{type === 'debt' ? 'Qanday to\'laysiz?' : 'Qanday to\'ladingiz?'}</p>
                    <Chips ariaLabel="To'lov usuli" value={method} onChange={setMethod} options={(type === 'debt' ? ['credit', 'cash', 'transfer'] : ['cash', 'transfer'])
                        .map((m) => ({ value: m, label: SUPPLIER_METHODS[m][0].toUpperCase() + SUPPLIER_METHODS[m].slice(1) }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm font-semibold">Sana
                        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="mt-2 h-12 w-full rounded-xl border-[1.5px] border-line-2 bg-card px-3 font-normal text-ink" />
                    </label>
                    {type === 'debt' && (
                        <label className="text-sm font-semibold">To'lov muddati
                            <input type="date" value={due} min={date} onChange={(e) => setDue(e.target.value)} className="mt-2 h-12 w-full rounded-xl border-[1.5px] border-line-2 bg-card px-3 font-normal text-ink" />
                        </label>
                    )}
                </div>
                {errors.due_date && <p className="text-sm text-debt">{errors.due_date}</p>}
                <Input size="md" label="Hujjat raqami (INV)" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="INV-0043" maxLength={100} error={errors.doc_number} />
                <TextArea label="Izoh (ixtiyoriy)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} placeholder="Un 20 qop, shakar 10 qop" />
                <div>
                    <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
                    {files.length < MAX_FILES && <Button variant="secondary" icon={Paperclip} onClick={() => fileRef.current?.click()}>Faktura rasmini qo'shish</Button>}
                    {files.length > 0 && (
                        <ul className="mt-2 space-y-1.5">
                            {files.map((f, i) => (
                                <li key={`${f.name}${i}`} className="flex items-center gap-2 rounded-xl bg-soft px-3 py-2 text-sm">
                                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                                    <button type="button" aria-label={`${f.name}ni olib tashlash`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}><X size={16} aria-hidden /></button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {errors.attachments && <p className="mt-1 text-sm text-debt">{errors.attachments}</p>}
                    <p className="mt-1.5 text-[13px] text-ink-3">JPG, PNG, WEBP yoki PDF · 5 MB gacha · {MAX_FILES} ta</p>
                </div>
            </div>
        </Sheet>
    )
}

// Ta'minotchi qo'shish / tahrirlash
export function SupplierFormSheet({ open, onClose, supplier, onSaved }) {
    const editing = !!supplier
    const [f, setF] = useState({})
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(null)

    useEffect(() => {
        if (!open) return
        setErrors({})
        setF({
            name: supplier?.name || '', phone: phoneDigits(supplier?.phone || ''), company_name: supplier?.company_name || '',
            inn: supplier?.inn || '', product_type: supplier?.product_type || '', address: supplier?.address || '', note: supplier?.note || '',
            opening_balance: 0, opening_direction: 'we_owe'
        })
    }, [open, supplier])

    const set = (patch) => { setF((x) => ({ ...x, ...patch })); setErrors({}) }

    const submit = async (andPurchase) => {
        const errs = {}
        if (!f.name?.trim()) errs.name = 'Nomini kiriting'
        if (!isValidPhone(f.phone)) errs.phone = "Raqam to'liq emas"
        if (f.inn && !/^\d{9}$/.test(f.inn)) errs.inn = 'INN 9 ta raqam'
        setErrors(errs)
        if (Object.keys(errs).length) return
        setBusy(andPurchase ? 'buy' : 'save')
        const payload = {
            name: f.name.trim(), phone: toApiPhone(f.phone), company_name: f.company_name.trim() || null, inn: f.inn || null,
            product_type: f.product_type.trim() || null, address: f.address.trim() || null, note: f.note.trim() || null
        }
        if (!editing && f.opening_balance > 0) Object.assign(payload, { opening_balance: f.opening_balance, opening_direction: f.opening_direction })
        try {
            const saved = editing ? await suppliersApi.update(supplier.id, payload) : await suppliersApi.create(payload)
            toast.success(editing ? 'Saqlandi' : "Ta'minotchi qo'shildi")
            emitChange('suppliers')
            onSaved?.(saved, andPurchase)
            onClose()
        } catch (err) {
            if (err?.response?.status === 422 && err.response.data?.errors) setErrors(fieldErrors(err))
            else toast.error(errorMessage(err))
        } finally {
            setBusy(null)
        }
    }

    return (
        <Sheet open={open} onClose={onClose} title={editing ? "Ta'minotchini tahrirlash" : "Yangi ta'minotchi"} onSubmit={() => submit(false)}
            footer={<div className="flex flex-col gap-2 sm:flex-row-reverse">
                {!editing && <Button size="lg" className="sm:flex-1" loading={busy === 'buy'} disabled={!!busy} onClick={() => submit(true)}>Saqlash va xarid yozish</Button>}
                <Button type="submit" size="lg" variant={editing ? 'primary' : 'secondary'} className="sm:flex-1" loading={busy === 'save'} disabled={!!busy}>Saqlash</Button>
            </div>}>
            <div className="space-y-4">
                <Input label="Nomi" required value={f.name || ''} onChange={(e) => set({ name: e.target.value })} error={errors.name} autoFocus maxLength={255} />
                <PhoneInput label="Telefon" required value={f.phone || ''} onChange={(v) => set({ phone: v })} error={errors.phone} />
                <p className="section-label">Ixtiyoriy</p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Input size="md" label="Kompaniya" value={f.company_name || ''} onChange={(e) => set({ company_name: e.target.value })} maxLength={255} />
                    <Input size="md" label="INN" inputMode="numeric" placeholder="9 xonali" value={f.inn || ''} onChange={(e) => set({ inn: e.target.value.replace(/\D/g, '').slice(0, 9) })} error={errors.inn} />
                    <Input size="md" label="Mahsulot" placeholder="Masalan: ichimliklar" value={f.product_type || ''} onChange={(e) => set({ product_type: e.target.value })} maxLength={255} />
                    <Input size="md" label="Manzil" placeholder="Shahar, ko'cha" value={f.address || ''} onChange={(e) => set({ address: e.target.value })} maxLength={500} />
                </div>
                {!editing && (
                    <div className="rounded-ctl border-[1.5px] border-line p-3.5">
                        <MoneyInput label="Eski qarz bo'lsa" value={f.opening_balance} onChange={(v) => set({ opening_balance: v })} error={errors.opening_balance} />
                        {f.opening_balance > 0 && (
                            <Chips className="mt-2" size="sm" ariaLabel="Kim qarzdor" value={f.opening_direction} onChange={(v) => set({ opening_direction: v })}
                                options={[{ value: 'we_owe', label: 'Biz qarzdormiz' }, { value: 'they_owe', label: 'U qarzdor' }]} />
                        )}
                    </div>
                )}
                <TextArea label="Izoh" value={f.note || ''} onChange={(e) => set({ note: e.target.value })} rows={2} maxLength={1000} placeholder="Qachon keladi, kim bilan gaplashiladi" />
            </div>
        </Sheet>
    )
}
