import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { customersApi } from '../api/customers.api'
import { locationsApi } from '../api/locations.api'
import LocationSelector from '../components/LocationSelector'
import LoadingSpinner from '../components/LoadingSpinner'
import { PHONE_PREFIX, formatPhoneNumber, getRawPhoneNumber } from '../utils/phoneMask'
import toast from 'react-hot-toast'

const CACHE_REGIONS_KEY = 'loc_regions_v1'
const CACHE_TTL_MS = 1000 * 60 * 60 * 48

const loadCache = (key) => {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || !parsed.t) return null
        if (Date.now() - parsed.t > CACHE_TTL_MS) { localStorage.removeItem(key); return null }
        return parsed.d
    } catch { return null }
}
const saveCache = (key, data) => {
    try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data })) } catch {}
}
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
const pickAny = (obj, keys, fallback = '') => {
    if (!obj || typeof obj !== 'object') return fallback
    for (const k of keys) {
        const v = obj[k]
        if (v !== null && v !== undefined && v !== '') return v
    }
    return fallback
}
const fuzzyNameMatch = (a, b) => {
    if (!a || !b) return false
    const x = String(a).trim().toLowerCase()
    const y = String(b).trim().toLowerCase()
    return x && y && (x === y || x.includes(y) || y.includes(x))
}
const resolveNameToId = (name, list) => {
    if (!name || !Array.isArray(list)) return null
    const clean = String(name).trim()
    if (!clean) return null
    const byMatch = list.find((item) => fuzzyNameMatch(item?.name, clean))
    return byMatch?.id != null ? numOrNull(byMatch.id) : null
}

export default function CustomerFormPage() {
    const navigate = useNavigate()
    const { id } = useParams()
    const isEdit = Boolean(id)

    const [regions, setRegions] = useState([])
    const [regionsLoaded, setRegionsLoaded] = useState(false)

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
        ;(async () => {
            const cached = loadCache(CACHE_REGIONS_KEY)
            if (Array.isArray(cached) && cached.length) {
                setRegions(cached)
                setRegionsLoaded(true)
                return
            }
            try {
                const data = await locationsApi.getRegions()
                const list = Array.isArray(data) ? data : (data?.data || [])
                setRegions(list)
                if (list.length) saveCache(CACHE_REGIONS_KEY, list)
            } catch (e) {
                console.warn('[CustomerFormPage] regions load fail', e?.message)
            } finally {
                setRegionsLoaded(true)
            }
        })()
    }, [])

    useEffect(() => {
        if (!isEdit) return
        let mounted = true
        ;(async () => {
            setLoadingCustomer(true)
            try {
                // customersApi.getCustomer already unwraps {customer|data|raw}
                const c = await customersApi.getCustomer(id)
                if (!mounted || !c || typeof c !== 'object') return

                const rawAddress = String(pickAny(c, ['address', 'full_address', 'address_line', 'location', 'place', 'manzil', 'addressLine1'], ''))
                let parsedRegionName = ''
                let parsedDistrictName = ''
                let parsedStreetName = ''
                if (rawAddress && rawAddress.includes(',')) {
                    const parts = rawAddress.split(',').map(s => s.trim()).filter(Boolean)
                    parsedRegionName = parts[0] || ''
                    parsedDistrictName = parts[1] || ''
                    parsedStreetName = parts.slice(2).join(', ') || ''
                } else if (rawAddress) {
                    parsedStreetName = rawAddress
                }

                const regionNestedObj = pickAny(c, ['region', 'viloyat', 'province', 'area', 'regionObj'], null)
                const districtNestedObj = pickAny(c, ['district', 'tuman', 'shahar', 'city', 'county', 'districtObj'], null)
                const streetNestedObj = pickAny(c, ['street', 'kocha', 'mfy', 'mahalla', 'neighborhood', 'streetObj', 'quarter'], null)

                const regionIdKeys = ['region_id', 'regionId', 'viloyat_id', 'province_id', 'provinceId', 'viloyatId']
                const regionNameKeys = ['region_name', 'regionName', 'viloyat_name', 'viloyatNomi', 'province_name', 'provinceName']
                const districtIdKeys = ['district_id', 'districtId', 'tuman_id', 'shahar_id', 'city_id', 'cityId', 'county_id', 'tumanId']
                const districtNameKeys = ['district_name', 'districtName', 'tuman_name', 'tumanNomi', 'city_name', 'cityName', 'county_name']
                const streetIdKeys = ['street_id', 'streetId', 'kocha_id', 'mfy_id', 'mahalla_id', 'mahallaId', 'neighborhood_id', 'quarter_id', 'kochaId']
                const streetNameKeys = ['street_name', 'streetName', 'kocha_name', 'kochaNomi', 'mfy_name', 'mahalla_name', 'mahallaNomi', 'neighborhood_name', 'quarter_name']

                let rIdRaw = pickId(regionNestedObj, pickAny(c, regionIdKeys, null))
                let rNameRaw = pickName(regionNestedObj, pickAny(c, regionNameKeys, ''), rIdRaw)
                let dIdRaw = pickId(districtNestedObj, pickAny(c, districtIdKeys, null))
                let dNameRaw = pickName(districtNestedObj, pickAny(c, districtNameKeys, ''), dIdRaw)
                let sIdRaw = pickId(streetNestedObj, pickAny(c, streetIdKeys, null))
                let sNameRaw = pickName(streetNestedObj, pickAny(c, streetNameKeys, ''), sIdRaw)

                const rName = rNameRaw || parsedRegionName
                const dName = dNameRaw || parsedDistrictName
                const sName = sNameRaw || parsedStreetName

                if (rIdRaw == null && rName && regionsLoaded) {
                    rIdRaw = resolveNameToId(rName, regions)
                }

                setForm({
                    name: pickAny(c, ['name', 'full_name', 'fullName', 'ismi', 'firstName', 'lastName'],
                        (c.first_name && c.last_name ? `${c.first_name} ${c.last_name}` : '')),
                    phone: pickAny(c, ['phone', 'phone_number', 'phoneNumber', 'tel', 'telefon', 'contact', 'mobile', 'mobileNumber', 'mobile_phone'])
                        ? formatPhoneNumber(String(pickAny(c, ['phone', 'phone_number', 'phoneNumber', 'tel', 'telefon', 'contact', 'mobile', 'mobileNumber', 'mobile_phone'])))
                        : PHONE_PREFIX,
                    address: rawAddress,
                    note: pickAny(c, ['note', 'notes', 'comment', 'comments', 'izoh', 'description', 'info', 'extra'], ''),
                    region_id: rIdRaw,
                    region_name: rName,
                    district_id: dIdRaw,
                    district_name: dName,
                    street_id: sIdRaw,
                    street_name: sName
                })
            } catch (err) {
                const message = err?.response?.data?.message || 'Mijoz ma\'lumotlarini yuklashda xatolik'
                toast.error(message)
                setTimeout(() => navigate('/customers'), 1000)
            } finally {
                if (mounted) setLoadingCustomer(false)
            }
        })()
        return () => { mounted = false }
    }, [id, isEdit, navigate, regionsLoaded, regions])

    const handleLocationChange = (location) => {
        setForm((prev) => ({ ...prev, ...location }))
    }

    const handleLocationAddressChange = (address) => {
        setForm((prev) => {
            if (prev.address && prev.address.trim() !== '') return prev
            return { ...prev, address }
        })
    }

    const makeConcatAddress = () => {
        const parts = []
        if (form.region_name) parts.push(String(form.region_name).trim())
        if (form.district_name) parts.push(String(form.district_name).trim())
        if (form.street_name) parts.push(String(form.street_name).trim())
        if (form.address) parts.push(String(form.address).trim())
        const dedup = []
        for (const p of parts) {
            if (p && !dedup.includes(p)) dedup.push(p)
        }
        return dedup.join(', ')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setErrors({})

        const regionSelected = form.region_id != null || !!String(form.region_name || '').trim()
        const districtSelected = form.district_id != null || !!String(form.district_name || '').trim()
        if (!regionSelected) {
            const msg = 'Iltimos viloyatni tanlang'
            setErrors({ region_id: [msg] })
            document.getElementById('customer-region-select')?.focus?.()
            toast.error(msg)
            setLoading(false)
            return
        }
        if (!districtSelected) {
            const msg = 'Iltimos tumanni tanlang'
            setErrors({ district_id: [msg] })
            document.getElementById('customer-district-select')?.focus?.()
            toast.error(msg)
            setLoading(false)
            return
        }

        const fullAddress = makeConcatAddress()

        try {
            const submitData = {
                name: String(form.name || '').trim(),
                phone: getRawPhoneNumber(form.phone),
                address: fullAddress || null,
                full_address: fullAddress || null,
                location: fullAddress || null,
                note: String(form.note || '').trim() || null,
                region_id: form.region_id ?? null,
                region_name: form.region_name ? String(form.region_name).trim() : null,
                district_id: form.district_id ?? null,
                district_name: form.district_name ? String(form.district_name).trim() : null,
                street_id: form.street_id ?? null,
                street_name: form.street_name ? String(form.street_name).trim() : null
            }

            if (isEdit) {
                const updated = await customersApi.updateCustomer(id, submitData)
                console.info('[CustomerFormPage] updated customer', updated?.id ?? id)
                toast.success('Mijoz ma\'lumotlari yangilandi')
                navigate(`/customers/${id}`)
            } else {
                const created = await customersApi.createCustomer(submitData)
                const newId = created?.id ?? null
                toast.success('Yangi mijoz qo\'shildi')
                if (newId) navigate(`/customers/${newId}`)
                else navigate('/customers')
            }
        } catch (err) {
            if (err?.response?.status === 422) {
                setErrors(err.response.data.errors || {})
                setError(err.response.data.message || 'Ma\'lumotlarni tekshiring')
            } else {
                setError(err?.response?.data?.message || 'Xatolik yuz berdi')
            }
        } finally {
            setLoading(false)
        }
    }

    if (loadingCustomer || !regionsLoaded) {
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
                            placeholder="To'liq manzil (qo'shimcha matn)"
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
