import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { customersApi } from '../api/customers.api'
import LocationSelector from '../components/LocationSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'
import toast from 'react-hot-toast'

const numOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : null
}

const pickId = (nested, flat) => {
    const fromNested = typeof nested === 'object' && nested?.id ? numOrNull(nested.id) : null
    return fromNested ?? numOrNull(flat) ?? null
}
const pickName = (nested, flatName, fallbackId) => {
    if (typeof nested === 'object' && nested?.name) return String(nested.name)
    if (typeof nested === 'string' && nested) return nested
    if (flatName) return String(flatName)
    if (fallbackId != null) return String(fallbackId)
    return ''
}

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
        region_name: '',
        district_id: null,
        district_name: '',
        street_id: null,
        street_name: ''
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

                const rawAddress = String(c.address || '')
                let parsedRegionName = ''
                let parsedDistrictName = ''
                let parsedStreetName = ''
                if (rawAddress && rawAddress.includes(',')) {
                    const parts = rawAddress.split(',').map(s => s.trim()).filter(Boolean)
                    parsedRegionName = parts[0] || ''
                    parsedDistrictName = parts[1] || ''
                    parsedStreetName = parts.slice(2).join(', ') || ''
                }

                const rIdRaw = pickId(c?.region, c?.region_id)
                const rNameRaw = pickName(c?.region, c?.region_name, rIdRaw)
                const dIdRaw = pickId(c?.district, c?.district_id)
                const dNameRaw = pickName(c?.district, c?.district_name, dIdRaw)
                const sIdRaw = pickId(c?.street, c?.street_id)
                const sNameRaw = pickName(c?.street, c?.street_name, sIdRaw)

                setForm({
                    name: c.name || '',
                    phone: c.phone ? formatPhoneNumber(String(c.phone)) : PHONE_PREFIX,
                    address: rawAddress,
                    note: c.note || '',
                    region_id: rIdRaw,
                    region_name: rNameRaw || parsedRegionName,
                    district_id: dIdRaw,
                    district_name: dNameRaw || parsedDistrictName,
                    street_id: sIdRaw,
                    street_name: sNameRaw || parsedStreetName
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

        if (form.region_id == null) {
            setError('Iltimos viloyatni tanlang')
            setErrors({ region_id: ['Iltimos viloyatni tanlang'] })
            document.getElementById('customer-region-select')?.focus?.()
            setLoading(false)
            toast.error('Iltimos viloyatni tanlang')
            return
        }
        if (form.district_id == null) {
            setErrors({ district_id: ['Iltimos tumanni tanlang'] })
            document.getElementById('customer-district-select')?.focus?.()
            setLoading(false)
            toast.error('Iltimos tumanni tanlang')
            return
        }

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

            <h1 id="customer-form-title" className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
                {isEdit ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
            </h1>

            <div className="card max-w-2xl">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                        {error}
                    </div>
                )}

                <form
                    id="customer-form"
                    aria-labelledby="customer-form-title"
                    onSubmit={handleSubmit}
                    className="space-y-4"
                >
                    <div>
                        <label htmlFor="customer-name" className="label">Ism *</label>
                        <input
                            id="customer-name"
                            data-testid="customer-name"
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
                        <label htmlFor="customer-phone" className="label">Telefon raqam *</label>
                        <input
                            id="customer-phone"
                            data-testid="customer-phone"
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
                        <label htmlFor="customer-address" className="label">Manzil</label>
                        <input
                            id="customer-address"
                            data-testid="customer-address"
                            type="text"
                            className="input"
                            placeholder="To'liq manzil"
                            value={form.address}
                            onChange={(e) => setForm({ ...form, address: e.target.value })}
                        />
                    </div>

                    <LocationSelector
                        idPrefix="customer"
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
                    {errors.region_id && <p id="customer-region-error" className="text-red-500 text-xs mt-1">{errors.region_id[0]}</p>}
                    {errors.district_id && <p id="customer-district-error" className="text-red-500 text-xs mt-1">{errors.district_id[0]}</p>}

                    <div>
                        <label htmlFor="customer-note" className="label">Izoh</label>
                        <textarea
                            id="customer-note"
                            data-testid="customer-note"
                            className="input min-h-[80px] resize-none"
                            placeholder="Qo'shimcha ma'lumot..."
                            value={form.note}
                            onChange={(e) => setForm({ ...form, note: e.target.value })}
                        />
                    </div>

                    <button
                        id="customer-submit-btn"
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
