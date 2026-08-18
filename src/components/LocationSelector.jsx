import { useState, useEffect, useMemo } from 'react'
import { locationsApi } from '../api/locations.api'

const CACHE_REGIONS_KEY = 'loc_regions_v1'
const CACHE_DISTRICTS_PREFIX = 'loc_districts_r'
const CACHE_STREETS_PREFIX = 'loc_streets_d'
const CACHE_TTL_MS = 1000 * 60 * 60 * 48

const numOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : null
}
const strOrEmpty = (v) => (v === null || v === undefined || v === '' ? '' : String(v))

const loadCache = (key) => {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || !parsed.t) return null
        if (Date.now() - parsed.t > CACHE_TTL_MS) {
            localStorage.removeItem(key)
            return null
        }
        return parsed.d
    } catch { return null }
}

const saveCache = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify({ t: Date.now(), d: data }))
    } catch {}
}

export default function LocationSelector({
    value = { region_id: null, region_name: '', district_id: null, district_name: '', street_id: null, street_name: '' },
    onChange,
    onAddressChange,
    required = false
}) {
    const [regions, setRegions] = useState([])
    const [districts, setDistricts] = useState([])
    const [streets, setStreets] = useState([])
    const [loadingRegions, setLoadingRegions] = useState(false)
    const [loadingDistricts, setLoadingDistricts] = useState(false)
    const [loadingStreets, setLoadingStreets] = useState(false)
    const [regionsError, setRegionsError] = useState('')
    const [districtsError, setDistrictsError] = useState('')
    const [streetsError, setStreetsError] = useState('')

    const regionId = numOrNull(value.region_id)
    const districtId = numOrNull(value.district_id)
    const streetId = numOrNull(value.street_id)

    const pickName = (objName, flatName, fallbackId) => {
        if (typeof objName === 'object' && objName?.name) return String(objName.name)
        if (typeof objName === 'string' && objName) return objName
        if (flatName) return String(flatName)
        if (fallbackId != null) return String(fallbackId)
        return ''
    }

    const suppliedRegionName = pickName(value.region, value.region_name, regionId)
    const suppliedDistrictName = pickName(value.district, value.district_name, districtId)
    const suppliedStreetName = pickName(value.street, value.street_name, streetId)

    const regionMatch = useMemo(() => regions.find((r) => numOrNull(r.id) === regionId), [regions, regionId])
    const districtMatch = useMemo(() => districts.find((d) => numOrNull(d.id) === districtId), [districts, districtId])
    const streetMatch = useMemo(() => streets.find((s) => numOrNull(s.id) === streetId), [streets, streetId])

    const regionLabel = regionMatch?.name || suppliedRegionName || (regionId != null ? 'Tanlangan viloyat' : '')
    const districtLabel = districtMatch?.name || suppliedDistrictName || (districtId != null ? 'Tanlangan tuman' : '')
    const streetLabel = streetMatch?.name || suppliedStreetName || (streetId != null ? 'Tanlangan ko\'cha' : '')

    const regionSelectValue = strOrEmpty(regionId)
    const districtSelectValue = strOrEmpty(districtId)
    const streetSelectValue = strOrEmpty(streetId)

    const needsRegionSynthetic = regionId != null && !regionMatch
    const needsDistrictSynthetic = districtId != null && !districtMatch
    const needsStreetSynthetic = streetId != null && !streetMatch

    useEffect(() => {
        ;(async () => {
            const cached = loadCache(CACHE_REGIONS_KEY)
            if (Array.isArray(cached) && cached.length) {
                setRegions(cached)
                return
            }
            setLoadingRegions(true)
            setRegionsError('')
            try {
                const data = await locationsApi.getRegions()
                const list = Array.isArray(data) ? data : data?.data || []
                setRegions(list)
                if (list.length) saveCache(CACHE_REGIONS_KEY, list)
            } catch (error) {
                console.error('Failed to load regions:', error)
                setRegions([])
                setRegionsError('Viloyatlar yuklanmadi')
            } finally {
                setLoadingRegions(false)
            }
        })()
    }, [])

    useEffect(() => {
        if (!regionId) {
            setDistricts([])
            setStreets([])
            return
        }
        let mounted = true
        ;(async () => {
            const cacheKey = `${CACHE_DISTRICTS_PREFIX}${regionId}`
            const cached = loadCache(cacheKey)
            if (Array.isArray(cached) && mounted) {
                setDistricts(cached)
            } else {
                setLoadingDistricts(true)
                setDistrictsError('')
            }
            try {
                const data = await locationsApi.getDistricts(regionId)
                const list = Array.isArray(data) ? data : data?.data || []
                if (mounted) {
                    setDistricts(list)
                    if (list.length) saveCache(cacheKey, list)
                }
            } catch (error) {
                console.error('Failed to load districts:', error)
                if (mounted) {
                    if (!loadCache(cacheKey)) {
                        setDistricts([])
                        setDistrictsError('Tumanlar yuklanmadi')
                    }
                }
            } finally {
                if (mounted) setLoadingDistricts(false)
            }
        })()
        return () => { mounted = false }
    }, [regionId])

    useEffect(() => {
        if (!districtId) {
            setStreets([])
            return
        }
        let mounted = true
        ;(async () => {
            const cacheKey = `${CACHE_STREETS_PREFIX}${districtId}`
            const cached = loadCache(cacheKey)
            if (Array.isArray(cached) && mounted) {
                setStreets(cached)
            } else {
                setLoadingStreets(true)
                setStreetsError('')
            }
            try {
                const data = await locationsApi.getStreets(districtId)
                const list = Array.isArray(data) ? data : data?.data || []
                if (mounted) {
                    setStreets(list)
                    if (list.length) saveCache(cacheKey, list)
                }
            } catch (error) {
                console.error('Failed to load streets:', error)
                if (mounted) {
                    if (!loadCache(cacheKey)) {
                        setStreets([])
                        setStreetsError('Koʻchalar yuklanmadi')
                    }
                }
            } finally {
                if (mounted) setLoadingStreets(false)
            }
        })()
        return () => { mounted = false }
    }, [districtId])

    const handleRegionChange = (e) => {
        const next = numOrNull(e.target.value)
        const nextName = next ? (regions.find((r) => numOrNull(r.id) === next)?.name || regionLabel || '') : ''
        onChange({
            region_id: next,
            region_name: nextName,
            district_id: null,
            district_name: '',
            street_id: null,
            street_name: ''
        })
        onAddressChange?.('')
    }

    const handleDistrictChange = (e) => {
        const next = numOrNull(e.target.value)
        const nextName = next ? (districts.find((d) => numOrNull(d.id) === next)?.name || districtLabel || '') : ''
        onChange({
            region_id: regionId,
            region_name: regionLabel,
            district_id: next,
            district_name: nextName,
            street_id: null,
            street_name: ''
        })
    }

    const handleStreetChange = (e) => {
        const next = numOrNull(e.target.value)
        const nextName = next ? (streets.find((s) => numOrNull(s.id) === next)?.name || streetLabel || '') : ''
        onChange({
            region_id: regionId,
            region_name: regionLabel,
            district_id: districtId,
            district_name: districtLabel,
            street_id: next,
            street_name: nextName
        })
    }

    const defaultPlaceholder = (list, loading, errMsg, emptyMsg) => {
        if (loading) return 'Yuklanmoqda...'
        if (errMsg) return errMsg
        if (list.length) return 'Tanlang...'
        return emptyMsg
    }

    const disableDistrict = !regionId || loadingDistricts
    const disableStreet = !districtId || loadingStreets

    return (
        <div className="space-y-3">
            <div>
                <label className="label">Viloyat</label>
                <select
                    className="input"
                    value={regionSelectValue}
                    onChange={handleRegionChange}
                    required={required}
                >
                    <option value="">{defaultPlaceholder(regions, loadingRegions, regionsError, 'Viloyatlar mavjud emas')}</option>
                    {needsRegionSynthetic && (
                        <option value={regionSelectValue} key={`s-region-${regionSelectValue}-${btoa(regionLabel).slice(0, 8)}`}>
                            {regionLabel}
                        </option>
                    )}
                    {regions.map((region) => {
                        const id = strOrEmpty(region.id)
                        return (
                            <option key={`r-${id}`} value={id}>
                                {region.name}
                            </option>
                        )
                    })}
                </select>
            </div>

            <div>
                <label className="label">Tuman</label>
                <select
                    className="input"
                    value={districtSelectValue}
                    onChange={handleDistrictChange}
                    disabled={disableDistrict}
                    required={required}
                >
                    <option value="">
                        {disableDistrict && !districtId
                            ? 'Avval viloyatni tanlang'
                            : defaultPlaceholder(districts, loadingDistricts, districtsError, 'Tumanlar mavjud emas')}
                    </option>
                    {needsDistrictSynthetic && (
                        <option value={districtSelectValue} key={`s-district-${districtSelectValue}-${btoa(districtLabel).slice(0, 8)}`}>
                            {districtLabel}
                        </option>
                    )}
                    {districts.map((district) => {
                        const id = strOrEmpty(district.id)
                        return (
                            <option key={`d-${id}`} value={id}>
                                {district.name}
                            </option>
                        )
                    })}
                </select>
            </div>

            <div>
                <label className="label">Ko'cha/MFY</label>
                <select
                    className="input"
                    value={streetSelectValue}
                    onChange={handleStreetChange}
                    disabled={disableStreet}
                    required={required}
                >
                    <option value="">
                        {disableStreet && !streetId
                            ? 'Avval tumanni tanlang'
                            : defaultPlaceholder(streets, loadingStreets, streetsError, 'Koʻchalar mavjud emas')}
                    </option>
                    {needsStreetSynthetic && (
                        <option value={streetSelectValue} key={`s-street-${streetSelectValue}-${btoa(streetLabel).slice(0, 8)}`}>
                            {streetLabel}
                        </option>
                    )}
                    {streets.map((street) => {
                        const id = strOrEmpty(street.id)
                        return (
                            <option key={`s-${id}`} value={id}>
                                {street.name}
                            </option>
                        )
                    })}
                </select>
            </div>
        </div>
    )
}
