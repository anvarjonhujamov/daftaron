import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { customersApi } from '../api/customers.api'
import LocationSelector from '../components/LocationSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'

export default function CustomerFormPage() {
    const navigate = useNavigate()
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
    const [error, setError] = useState('')
    const [errors, setErrors] = useState({})

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
            const submitData = { ...form, phone: getRawPhoneNumber(form.phone) }
            await customersApi.createCustomer(submitData)
            navigate('/customers')
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

    return (
        <div className="px-4 py-6">
            <div className="mb-4">
                <Link to="/customers" className="text-primary-600 text-sm">
                    ← Mijozlar
                </Link>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 mb-6">Yangi mijoz</h1>

            <div className="card">
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
                            type="text"
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
                            district_id: form.district_id,
                            street_id: form.street_id
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
