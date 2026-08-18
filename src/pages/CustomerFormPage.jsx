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
    const [pageLoading, setPageLoading] = useState(true)
    const [error, setError] = useState('')
    const [errors, setErrors] = useState({})

    useEffect(() => {
        let mounted = true
        ;(async () => {
            setPageLoading(true)
            try {
                // ========= 1. REGIONS (cache or HTTP) =========
                let regions = []
                const cachedRegions = loadCache(CACHE_REGIONS_KEY)
                if (Array.isArray(cachedRegions) && cachedRegions.length) {
                    regions = cachedRegions
                } else {
                    try {
                        const r = await locationsApi.getRegions()
                        regions = Array.isArray(r) ? r : (r?.data || [])
                        if (Array.isArray(regions) && regions.length) saveCache(CACHE_REGIONS_KEY, regions)
                    } catch (e) {
                        console.warn('[CustomerFormPage] regions load fail', e?.message)
                        regions = []
                    }
                }

                if (!isEdit) {
                    if (mounted) setPageLoading(false)
                    return
                }

                // ========= 2. GET CUSTOMER =========
                const c = await customersApi.getCustomer(id)
                console.log('[CustomerFormPage:getCustomer] RAW CUSTOMER:', c)
                console.log('[CustomerFormPage:getCustomer] OBJECT KEYS:', c && typeof c === 'object' ? Object.keys(c) : [])

                if (!mounted || !c || typeof c !== 'object') {
                    if (mounted) setPageLoading(false)
                    return
                }

                // ========= 3. ADDRESS (30+ variant) =========
                const addressKeys = [
                    'address', 'full_address', 'address_line', 'address_line1',
                    'location', 'place', 'manzil', 'addressLine1',
                    'customer_address', 'customer_full_address', 'customer_location', 'customer_manzil',
                    'c_address', 'c_location', 'profile_address', 'user_address'
                ]
                const rawAddress = String(pickAny(c, addressKeys, ''))
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

                // ========= 4. NESTED OBJECTS (30+ variant) =========
                const regionObjKeys = [
                    'region', 'viloyat', 'province', 'area', 'regionObj',
                    'customer_region', 'customer_viloyat', 'user_region', 'profile_region'
                ]
                const districtObjKeys = [
                    'district', 'tuman', 'shahar', 'city', 'county', 'districtObj',
                    'customer_district', 'customer_tuman', 'user_district', 'profile_district'
                ]
                const streetObjKeys = [
                    'street', 'kocha', 'mfy', 'mahalla', 'neighborhood', 'streetObj', 'quarter',
                    'customer_street', 'customer_kocha', 'customer_mfy', 'customer_mahalla',
                    'user_street', 'profile_street'
                ]
                const regionNestedObj = pickAny(c, regionObjKeys, null)
                const districtNestedObj = pickAny(c, districtObjKeys, null)
                const streetNestedObj = pickAny(c, streetObjKeys, null)

                const regionIdKeys = [
                    'region_id', 'regionId', 'viloyat_id', 'province_id', 'provinceId', 'viloyatId',
                    'customer_region_id', 'customer_regionId', 'customer_viloyat_id', 'customer_province_id',
                    'c_region_id', 'user_region_id', 'profile_region_id'
                ]
                const regionNameKeys = [
                    'region_name', 'regionName', 'viloyat_name', 'viloyatNomi', 'province_name', 'provinceName',
                    'customer_region_name', 'customer_regionName', 'customer_viloyat_name', 'customer_viloyatNomi',
                    'customer_province_name', 'customer_provinceName',
                    'c_region_name', 'user_region_name', 'profile_region_name'
                ]
                const districtIdKeys = [
                    'district_id', 'districtId', 'tuman_id', 'shahar_id', 'city_id', 'cityId', 'county_id', 'tumanId',
                    'customer_district_id', 'customer_districtId', 'customer_tuman_id', 'customer_city_id',
                    'c_district_id', 'user_district_id', 'profile_district_id'
                ]
                const districtNameKeys = [
                    'district_name', 'districtName', 'tuman_name', 'tumanNomi', 'city_name', 'cityName', 'county_name',
                    'customer_district_name', 'customer_districtName', 'customer_tuman_name', 'customer_tumanNomi',
                    'customer_city_name', 'customer_cityName',
                    'c_district_name', 'user_district_name', 'profile_district_name'
                ]
                const streetIdKeys = [
                    'street_id', 'streetId', 'kocha_id', 'mfy_id', 'mahalla_id', 'mahallaId',
                    'neighborhood_id', 'quarter_id', 'kochaId',
                    'customer_street_id', 'customer_streetId', 'customer_kocha_id', 'customer_mfy_id',
                    'customer_mahalla_id', 'customer_mahallaId', 'customer_neighborhood_id', 'customer_quarter_id',
                    'c_street_id', 'user_street_id', 'profile_street_id'
                ]
                const streetNameKeys = [
                    'street_name', 'streetName', 'kocha_name', 'kochaNomi', 'mfy_name', 'mahalla_name', 'mahallaNomi',
                    'neighborhood_name', 'quarter_name',
                    'customer_street_name', 'customer_streetName', 'customer_kocha_name', 'customer_kochaNomi',
                    'customer_mfy_name', 'customer_mahalla_name', 'customer_mahallaNomi',
                    'customer_neighborhood_name', 'customer_quarter_name',
                    'c_street_name', 'user_street_name', 'profile_street_name'
                ]

                let rIdRaw = pickId(regionNestedObj, pickAny(c, regionIdKeys, null))
                let rNameRaw = pickName(regionNestedObj, pickAny(c, regionNameKeys, ''), rIdRaw)
                let dIdRaw = pickId(districtNestedObj, pickAny(c, districtIdKeys, null))
                let dNameRaw = pickName(districtNestedObj, pickAny(c, districtNameKeys, ''), dIdRaw)
                let sIdRaw = pickId(streetNestedObj, pickAny(c, streetIdKeys, null))
                let sNameRaw = pickName(streetNestedObj, pickAny(c, streetNameKeys, ''), sIdRaw)

                const rName = rNameRaw || parsedRegionName
                const dName = dNameRaw || parsedDistrictName
                const sName = sNameRaw || parsedStreetName

                if (rIdRaw == null && rName && regions.length) {
                    rIdRaw = resolveNameToId(rName, regions)
                }
                // If we now have region ID but district ID null, try to load districts list for NAME→ID resolve
                let dList = []
                if (rIdRaw != null && dIdRaw == null && dName) {
                    try {
                        const districtsResp = await locationsApi.getDistricts(rIdRaw)
                        dList = Array.isArray(districtsResp) ? districtsResp : (districtsResp?.data || [])
                        dIdRaw = resolveNameToId(dName, dList)
                    } catch (e) { console.warn('[CustomerFormPage] districts lookup fail', e) }
                }
                // If district ID resolved but street ID null and street name given, try street NAME→ID
                if (dIdRaw != null && sIdRaw == null && sName) {
                    try {
                        const streetsResp = await locationsApi.getStreets(dIdRaw)
                        const sList = Array.isArray(streetsResp) ? streetsResp : (streetsResp?.data || [])
                        sIdRaw = resolveNameToId(sName, sList)
                    } catch (e) { console.warn('[CustomerFormPage] streets lookup fail', e) }
                }

                // ========= NAME =========
                const nameKeys = [
                    'name', 'full_name', 'fullName', 'ismi', 'firstName', 'lastName', 'customer_name',
                    'customer_full_name', 'customer_fullName', 'customer_ismi', 'c_name', 'user_name', 'profile_name',
                    'fullname', 'client_name'
                ]
                const firstName = pickAny(c, ['first_name', 'firstName', 'customer_first_name', 'firstNameK'], '')
                const lastName = pickAny(c, ['last_name', 'lastName', 'customer_last_name', 'lastNameK'], '')
                const comboFL = (firstName && lastName) ? `${firstName} ${lastName}` : ''
                const resolvedName = pickAny(c, nameKeys, comboFL)

                // ========= PHONE =========
                const phoneKeys = [
                    'phone', 'phone_number', 'phoneNumber', 'tel', 'telefon', 'contact',
                    'mobile', 'mobileNumber', 'mobile_phone', 'mobilePhone',
                    'customer_phone', 'customer_phone_number', 'customer_phoneNumber', 'customer_mobile', 'customer_telefon',
                    'c_phone', 'user_phone', 'profile_phone', 'client_phone'
                ]
                const resolvedPhone = pickAny(c, phoneKeys, '')

                // ========= NOTE =========
                const noteKeys = [
                    'note', 'notes', 'comment', 'comments', 'izoh', 'description', 'info', 'extra', 'remarks',
                    'customer_note', 'customer_comment', 'customer_izoh', 'customer_info', 'c_note', 'user_note', 'profile_note'
                ]
                const resolvedNote = pickAny(c, noteKeys, '')

                const nextForm = {
                    name: String(resolvedName || ''),
                    phone: resolvedPhone ? formatPhoneNumber(String(resolvedPhone)) : PHONE_PREFIX,
                    address: rawAddress,
                    note: String(resolvedNote || ''),
                    region_id: rIdRaw,
                    region_name: rName,
                    district_id: dIdRaw,
                    district_name: dName,
                    street_id: sIdRaw,
                    street_name: sName
                }
                console.log('[CustomerFormPage] setForm state =', nextForm)
                console.log('[CustomerFormPage] region_id =', rIdRaw, 'region_name =', rName)
                console.log('[CustomerFormPage] district_id =', dIdRaw, 'district_name =', dName)
                console.log('[CustomerFormPage] street_id =', sIdRaw, 'street_name =', sName)

                setForm(nextForm)
            } catch (err) {
                console.error('[CustomerFormPage] load error:', err)
                const message = err?.response?.data?.message || 'Mijoz ma\'lumotlarini yuklashda xatolik'
                toast.error(message)
                setTimeout(() => navigate('/customers'), 1000)
            } finally {
                if (mounted) setPageLoading(false)
            }
        })()
        return () => { mounted = false }
    }, [id, isEdit, navigate])

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
        console.log('[CustomerFormPage:submit] payload =', { fullAddress, form })

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
                console.info('[CustomerFormPage] updated OK', updated?.id ?? id)
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
            console.error('[CustomerFormPage] submit error', err)
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

    if (pageLoading) {
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
