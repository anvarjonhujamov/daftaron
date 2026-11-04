import { useEffect, useState } from 'react'
import { Button, MoneyInput, TextArea } from '../ui/controls'
import { Sheet } from '../ui/Sheet'
import { todayYmd, toYmd } from '../utils/date'
import { formatNumber } from '../utils/format'

// Nasiyani tahrirlash: nasiya sahifasi va mijoz kartasidan ochiladi
export default function EditSheet({ open, debt, paid, onClose, onSave }) {
    const today = todayYmd()
    const [amount, setAmount] = useState(0)
    const [given, setGiven] = useState('')
    const [due, setDue] = useState('')
    const [note, setNote] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => {
        if (!open) return
        setAmount(Math.round(Number(debt.total_amount || 0)))
        setGiven(toYmd(debt.debt_date))
        setDue(toYmd(debt.return_date))
        setNote(debt.description || '')
    }, [open, debt])
    const tooLow = amount < paid
    const submit = async () => {
        if (tooLow || !(amount > 0)) return
        setBusy(true)
        await onSave({ amount, given_at: given, due_date: due || null, note: note.trim() || null })
        setBusy(false)
    }
    return (
        <Sheet open={open} onClose={onClose} title="Nasiyani tahrirlash" width={560} onSubmit={submit}
            footer={<Button type="submit" size="lg" block loading={busy} disabled={tooLow || !(amount > 0)}>Saqlash</Button>}>
            <div className="space-y-4">
                <MoneyInput label="Summa" value={amount} onChange={setAmount} error={tooLow ? `To'langan qismdan (${formatNumber(paid)}) kam bo'lmaydi` : undefined} />
                <div className="grid grid-cols-2 gap-3">
                    <label className="text-sm font-semibold">Berilgan
                        <input type="date" value={given} max={today} onChange={(e) => setGiven(e.target.value)} className="mt-2 h-12 w-full rounded-xl border-[1.5px] border-line-2 bg-card px-3 font-normal text-ink" />
                    </label>
                    <label className="text-sm font-semibold">Qaytarish
                        <input type="date" value={due} min={given} onChange={(e) => setDue(e.target.value)} className="mt-2 h-12 w-full rounded-xl border-[1.5px] border-line-2 bg-card px-3 font-normal text-ink" />
                    </label>
                </div>
                <TextArea label="Izoh" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
            </div>
        </Sheet>
    )
}
