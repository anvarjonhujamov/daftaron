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

const fuzzyNameMatch = (a, b) => {
    if (!a || !b) return false
    const x = String(a).trim().toLowerCase()
    const y = String(b).trim().toLowerCase()
    return x && y && (x === y || x.includes(y) || y.includes(x))
}

const resolveIdAndName = (suppliedId, suppliedName, list, makeNameOption) => {
    const sid = numOrNull(suppliedId)
    const sname = strOrEmpty(suppliedName)
    if (sid != null) {
        const byId = list.find((item) => numOrNull(item.id) === sid)
        if (byId) {
            return {
                id: sid,
                name: byId.name || sname || '',
                type: 'id',
                selectValue: strOrEmpty(sid),
                effectiveName: byId.name || sname || '',
                needsSynthetic: false,
                syntheticValue: null,
                syntheticKey: null,
                itemDisabled: false
            }
        }
        return {
            id: sid,
            name: sname || 'Tanlangan',
            type: 'id-synthetic',
            selectValue: strOrEmpty(sid),
            effectiveName: sname || 'Tanlangan',
            needsSynthetic: true,
            syntheticValue: strOrEmpty(sid),
            syntheticKey: makeNameOption ? null : `s-id-${sid}-${btoa(sname).slice(0, 6)}`,
            itemDisabled: false
        }
    }
    if (sname) {
        const byName = list.find((item) => fuzzyNameMatch(item.name, sname))
        if (byName?.id) {
            const nid = numOrNull(byName.id)
            return {
                id: nid,
                name: byName.name || sname,
                type: 'name-match',
                selectValue: strOrEmpty(nid),
                effectiveName: byName.name || sname,
                needsSynthetic: false,
                syntheticValue: null,
                syntheticKey: null,
                itemDisabled: false
            }
        }
        const syntheticValue = `__name:${encodeURIComponent(sname)}`
        return {
            id: null,
            name: sname,
            type: 'synthetic-name',
            selectValue: syntheticValue,
            effectiveName: sname,
            needsSynthetic: true,
            syntheticValue,
            syntheticKey: `s-name-${btoa(sname).slice(0, 8)}`,
            itemDisabled: true
        }
    }
    return {
        id: null, name: '', type: 'empty',
        selectValue: '', effectiveName: '',
        needsSynthetic: false, syntheticValue: null, syntheticKey: null,
        itemDisabled: false
    }
}

export default function LocationSelector({
    value = { region_id: null, region_name: '', district_id: null, district_name: '', street_id: null, street_name: '' },
    onChange,
    onAddressChange,
    required = false,
    idPrefix = 'loc',
    className = ''
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

    const pickName = (objName, flatName, fallbackId) => {
        if (typeof objName === 'object' && objName?.name) return String(objName.name)
        if (typeof objName === 'string' && objName) return objName
        if (flatName) return String(flatName)
        if (fallbackId != null) return String(fallbackId)
        return ''
    }

    const suppliedRegionName = pickName(value.region, value.region_name, value.region_id)
    const suppliedDistrictName = pickName(value.district, value.district_name, value.district_id)
    const suppliedStreetName = pickName(value.street, value.street_name, value.street_id)

    const region = useMemo(
        () => resolveIdAndName(value.region_id, suppliedRegionName, regions),
        [value.region_id, suppliedRegionName, regions]
    )
    const district = useMemo(
        () => resolveIdAndName(value.district_id, suppliedDistrictName, districts),
        [value.district_id, suppliedDistrictName, districts]
    )
    const street = useMemo(
        () => resolveIdAndName(value.street_id, suppliedStreetName, streets),
        [value.street_id, suppliedStreetName, streets]
    )

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
        if (!region.id) {
            setDistricts([])
            setStreets([])
            return
        }
        let mounted = true
        ;(async () => {
            const cacheKey = `${CACHE_DISTRICTS_PREFIX}${region.id}`
            const cached = loadCache(cacheKey)
            if (Array.isArray(cached) && mounted) {
                setDistricts(cached)
            } else {
                setLoadingDistricts(true)
                setDistrictsError('')
            }
            try {
                const data = await locationsApi.getDistricts(region.id)
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
    }, [region.id])

    useEffect(() => {
        if (!district.id) {
            setStreets([])
            return
        }
        let mounted = true
        ;(async () => {
            const cacheKey = `${CACHE_STREETS_PREFIX}${district.id}`
            const cached = loadCache(cacheKey)
            if (Array.isArray(cached) && mounted) {
                setStreets(cached)
            } else {
                setLoadingStreets(true)
                setStreetsError('')
            }
            try {
                const data = await locationsApi.getStreets(district.id)
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
    }, [district.id])

    const handleChange = (rawValue, list, level) => {
        if (!rawValue) {
            if (level === 'region') {
                onChange({ region_id: null, region_name: '', district_id: null, district_name: '', street_id: null, street_name: '' })
                onAddressChange?.('')
            } else if (level === 'district') {
                onChange({ region_id: region.id, region_name: region.effectiveName, district_id: null, district_name: '', street_id: null, street_name: '' })
            } else {
                onChange({ region_id: region.id, region_name: region.effectiveName, district_id: district.id, district_name: district.effectiveName, street_id: null, street_name: '' })
            }
            return
        }
        if (rawValue.startsWith('__name:')) {
            const name = decodeURIComponent(rawValue.slice(7))
            if (level === 'region') {
                onChange({ region_id: null, region_name: name, district_id: null, district_name: '', street_id: null, street_name: '' })
            } else if (level === 'district') {
                onChange({ region_id: region.id, region_name: region.effectiveName, district_id: null, district_name: name, street_id: null, street_name: '' })
            } else {
                onChange({ region_id: region.id, region_name: region.effectiveName, district_id: district.id, district_name: district.effectiveName, street_id: null, street_name: name })
            }
            return
        }
        const id = numOrNull(rawValue)
        const match = list.find((item) => numOrNull(item.id) === id)
        const nm = match?.name || ''
        if (level === 'region') {
            onChange({ region_id: id, region_name: nm, district_id: null, district_name: '', street_id: null, street_name: '' })
            onAddressChange?.('')
        } else if (level === 'district') {
            onChange({ region_id: region.id, region_name: region.effectiveName, district_id: id, district_name: nm, street_id: null, street_name: '' })
        } else {
            onChange({ region_id: region.id, region_name: region.effectiveName, district_id: district.id, district_name: district.effectiveName, street_id: id, street_name: nm })
        }
    }

    const defaultPlaceholder = (list, loading, errMsg, emptyMsg) => {
        if (loading) return 'Yuklanmoqda...'
        if (errMsg) return errMsg
        if (list.length) return 'Tanlang...'
        return emptyMsg
    }

    const disableDistrict = !region.id || loadingDistricts
    const disableStreet = !district.id || loadingStreets

    return (
        <div className={`space-y-3 ${className}`}>
            <div>
                <label htmlFor={`${idPrefix}-region-select`} className="label">Viloyat</label>
                <select
                    id={`${idPrefix}-region-select`}
                    data-testid={`${idPrefix}-region-select`}
                    className="input"
                    value={region.selectValue}
                    onChange={(e) => handleChange(e.target.value, regions, 'region')}
                    required={required}
                >
                    <option value="">{defaultPlaceholder(regions, loadingRegions, regionsError, 'Viloyatlar mavjud emas')}</option>
                    {region.needsSynthetic && (
                        <option value={region.syntheticValue} key={region.syntheticKey}>
                            {region.effectiveName}
                        </option>
                    )}
                    {regions.map((r) => {
                        const id = strOrEmpty(r.id)
                        return (
                            <option key={`r-${id}`} value={id}>
                                {r.name}
                            </option>
                        )
                    })}
                </select>
            </div>

            <div>
                <label htmlFor={`${idPrefix}-district-select`} className="label">Tuman</label>
                <select
                    id={`${idPrefix}-district-select`}
                    data-testid={`${idPrefix}-district-select`}
                    className="input"
                    value={district.selectValue}
                    onChange={(e) => handleChange(e.target.value, districts, 'district')}
                    disabled={disableDistrict && !district.needsSynthetic}
                    required={required}
                >
                    <option value="">
                        {disableDistrict && !district.needsSynthetic
                            ? 'Avval viloyatni tanlang'
                            : defaultPlaceholder(districts, loadingDistricts, districtsError, 'Tumanlar mavjud emas')}
                    </option>
                    {district.needsSynthetic && (
                        <option value={district.syntheticValue} key={district.syntheticKey}>
                            {district.effectiveName}
                        </option>
                    )}
                    {districts.map((d) => {
                        const id = strOrEmpty(d.id)
                        return (
                            <option key={`d-${id}`} value={id}>
                                {d.name}
                            </option>
                        )
                    })}
                </select>
            </div>

            <div>
                <label htmlFor={`${idPrefix}-street-select`} className="label">Ko'cha/MFY</label>
                <select
                    id={`${idPrefix}-street-select`}
                    data-testid={`${idPrefix}-street-select`}
                    className="input"
                    value={street.selectValue}
                    onChange={(e) => handleChange(e.target.value, streets, 'street')}
                    disabled={disableStreet && !street.needsSynthetic}
                    required={required}
                >
                    <option value="">
                        {disableStreet && !street.needsSynthetic
                            ? 'Avval tumanni tanlang'
                            : defaultPlaceholder(streets, loadingStreets, streetsError, 'Koʻchalar mavjud emas')}
                    </option>
                    {street.needsSynthetic && (
                        <option value={street.syntheticValue} key={street.syntheticKey}>
                            {street.effectiveName}
                        </option>
                    )}
                    {streets.map((s) => {
                        const id = strOrEmpty(s.id)
                        return (
                            <option key={`s-${id}`} value={id}>
                                {s.name}
                            </option>
                        )
                    })}
                </select>
            </div>
        </div>
    )
}
