import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { customersApi } from '../api/customers.api'
import LocationSelector from '../components/LocationSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'
import toast from 'react-hot-toast'

export default function CustomerFormPage() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)

    const [form, setForm] = useState({
        name: '',
        phone: PHONE_PREFIX,
        address: '',
        note: '',
        region_id: null,
        district_id: null,
        street_id: null
    })
    const [loading, setLoading] = useState(false)
    const [loadingCustomer, setLoadingCustomer] = useState(isEdit)
    const [error, setError] = useState('')
    const [errors, setErrors] = useState({})

    useEffect(() => {
        if (!isEdit) return
        let mounted = true

        ;(async () => {
            setLoadingCustomer(true)
            try {
                const data = await customersApi.getCustomer(id)
                const c = data?.customer ?? data
                if (!mounted || !c) return

                const numOrNull = (v) => {
                    if (v === null || v === undefined || v === '') return null
                    const n = parseInt(v, 10)
                    return Number.isFinite(n) ? n : null
                }

                setForm({
                    name: c.name || '',
                    phone: c.phone ? formatPhoneNumber(String(c.phone)) : PHONE_PREFIX,
                    address: c.address || '',
                    note: c.note || '',
                    region_id: numOrNull(c.region_id) ?? numOrNull(c.region?.id) ?? null,
                    region_name: c.region?.name || c.region_name || '',
                    district_id: numOrNull(c.district_id) ?? numOrNull(c.district?.id) ?? null,
                    district_name: c.district?.name || c.district_name || '',
                    street_id: numOrNull(c.street_id) ?? numOrNull(c.street?.id) ?? null,
                    street_name: c.street?.name || c.street_name || ''
                })
            } catch (err) {
                const message = err?.response?.data?.message || 'Mijoz ma\'lumotlarini yuklashda xatolik'
                toast.error(message)
                setTimeout(() => navigate('/customers'), 1000)
            } finally {
                if (mounted) setLoadingCustomer(false)
            }
        })()

        return () => {
            mounted = false
        }
    }, [id, isEdit, navigate])

    const handleLocationChange = (location) => {
        setForm((prev) => ({ ...prev, ...location }))
    }

    const handleLocationAddressChange = (address) => {
        setForm((prev) => {
            if (prev.address && prev.address.trim() !== '') {
                return prev
            }
            return { ...prev, address }
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setErrors({})

        try {
            const submitData = {
                name: form.name.trim(),
                phone: getRawPhoneNumber(form.phone),
                address: form.address.trim() || null,
                note: form.note.trim() || null,
                region_id: form.region_id ?? null,
                district_id: form.district_id ?? null,
                street_id: form.street_id ?? null
            }

            if (isEdit) {
                await customersApi.updateCustomer(id, submitData)
                toast.success('Mijoz ma\'lumotlari yangilandi')
                navigate(`/customers/${id}`)
            } else {
                await customersApi.createCustomer(submitData)
                toast.success('Yangi mijoz qo\'shildi')
                navigate('/customers')
            }
        } catch (err) {
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {})
                setError(err.response.data.message || 'Ma\'lumotlarni tekshiring')
            } else {
                setError(err.response?.data?.message || 'Xatolik yuz berdi')
            }
        } finally {
            setLoading(false)
        }
    }

    if (loadingCustomer) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner />
            </div>
        )
    }

    return (
        <div className="px-4 py-6">
            <div className="mb-4">
                <Link to={isEdit ? `/customers/${id}` : '/customers'} className="text-primary-600 text-sm">
                    ← Mijozlar
                </Link>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                {isEdit ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
            </h1>

            <div className="card max-w-2xl">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Ism *</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Mijoz ismi"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name[0]}</p>}
                    </div>

                    <div>
                        <label className="label">Telefon raqam *</label>
                        <input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            className="input"
                            placeholder="+998 XX XXX XX XX"
                            value={form.phone}
                            onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value)
                                setForm({ ...form, phone: formatted })
                            }}
                            required
                        />
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone[0]}</p>}
                    </div>

                    <div>
                        <label className="label">Manzil</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="To'liq manzil"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                        />
                    </div>

                    <LocationSelector
                        value={{
                            region_id: form.region_id,
                            region_name: form.region_name,
                            district_id: form.district_id,
                            district_name: form.district_name,
                            street_id: form.street_id,
                            street_name: form.street_name
                        }}
                        onChange={handleLocationChange}
                        onAddressChange={handleLocationAddressChange}
                    />

                    <div>
                        <label className="label">Izoh</label>
                        <textarea
                            className="input min-h-[80px] resize-none"
                            placeholder="Qo'shimcha ma'lumot..."
                            value={form.note}
                            onChange={(e) => setForm({ ...form, note: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={loading}
                    >
                        {loading ? <LoadingSpinner size="sm" /> : 'Saqlash'}
                    </button>
                </form>
            </div>
        </div>
    )
}
