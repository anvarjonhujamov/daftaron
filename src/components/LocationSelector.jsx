import { useState, useEffect } from 'react'
import { locationsApi } from '../api/locations.api'

export default function LocationSelector({
    value = { region_id: null, district_id: null, street_id: null },
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

    const isNumericId = (v) => typeof v === 'number' || (typeof v === 'string' && String(parseInt(v, 10)) === String(v))
    const numOrNull = (v) => {
        if (v === null || v === undefined || v === '') return null
        const n = parseInt(v, 10)
        return Number.isFinite(n) ? n : null
    }
    const strOrEmpty = (v) => (v === null || v === undefined || v === '' ? '' : String(v))

    const findRegion = (idOrName) => regions.find((r) => strOrEmpty(r.id) === strOrEmpty(idOrName))
    const findDistrict = (idOrName) => districts.find((d) => strOrEmpty(d.id) === strOrEmpty(idOrName))
    const findStreet = (idOrName) => streets.find((s) => strOrEmpty(s.id) === strOrEmpty(idOrName))

    const suppliedRegionName = value?.region_name || value?.regionName || ''
    const suppliedDistrictName = value?.district_name || value?.districtName || ''
    const suppliedStreetName = value?.street_name || value?.streetName || ''

    const getRegionLabel = (v) => {
        if (v === null || v === undefined || v === '') return ''
        const match = findRegion(v)
        if (match) return match.name
        if (suppliedRegionName) return suppliedRegionName
        if (loadingRegions) return 'Yuklanmoqda...'
        if (!isNumericId(v)) return String(v)
        return 'Tanlangan viloyat'
    }
    const getDistrictLabel = (v) => {
        if (v === null || v === undefined || v === '') return ''
        const match = findDistrict(v)
        if (match) return match.name
        if (suppliedDistrictName) return suppliedDistrictName
        if (loadingDistricts) return 'Yuklanmoqda...'
        if (!isNumericId(v)) return String(v)
        return 'Tanlangan tuman'
    }
    const getStreetLabel = (v) => {
        if (v === null || v === undefined || v === '') return ''
        const match = findStreet(v)
        if (match) return match.name
        if (suppliedStreetName) return suppliedStreetName
        if (loadingStreets) return 'Yuklanmoqda...'
        if (!isNumericId(v)) return String(v)
        return 'Tanlangan ko\'cha'
    }

    const buildLocationLabel = (regionId, districtId, streetId) => {
        const parts = []
        const regionName = getRegionLabel(regionId)
        const districtName = getDistrictLabel(districtId)
        const streetName = getStreetLabel(streetId)
        if (regionName) parts.push(regionName)
        if (districtName) parts.push(districtName)
        if (streetName) parts.push(streetName)
        return parts.join(', ')
    }

    useEffect(() => {
        loadRegions()
    }, [])

    useEffect(() => {
        const numeric = numOrNull(value.region_id)
        if (numeric) {
            loadDistricts(numeric)
        } else {
            setDistricts([])
            setStreets([])
        }
    }, [value.region_id])

    useEffect(() => {
        const numeric = numOrNull(value.district_id)
        if (numeric) {
            loadStreets(numeric)
        } else {
            setStreets([])
        }
    }, [value.district_id])

    const loadRegions = async () => {
        setLoadingRegions(true)
        setRegionsError('')
        try {
            const data = await locationsApi.getRegions()
            setRegions(Array.isArray(data) ? data : data.data || [])
        } catch (error) {
            console.error('Failed to load regions:', error)
            setRegions([])
            setRegionsError('Viloyatlar yuklanmadi')
        } finally {
            setLoadingRegions(false)
        }
    }

    const loadDistricts = async (regionId) => {
        setLoadingDistricts(true)
        setDistrictsError('')
        try {
            const data = await locationsApi.getDistricts(regionId)
            setDistricts(Array.isArray(data) ? data : data.data || [])
        } catch (error) {
            console.error('Failed to load districts:', error)
            setDistricts([])
            setDistrictsError('Tumanlar yuklanmadi')
        } finally {
            setLoadingDistricts(false)
        }
    }

    const loadStreets = async (districtId) => {
        setLoadingStreets(true)
        setStreetsError('')
        try {
            const data = await locationsApi.getStreets(districtId)
            setStreets(Array.isArray(data) ? data : data.data || [])
        } catch (error) {
            console.error('Failed to load streets:', error)
            setStreets([])
            setStreetsError('Koʻchalar yuklanmadi')
        } finally {
            setLoadingStreets(false)
        }
    }

    const handleRegionChange = (e) => {
        const regionId = numOrNull(e.target.value)
        const regionNameMatch = regionId ? findRegion(regionId)?.name || suppliedRegionName : ''
        onChange({
            region_id: regionId,
            region_name: regionNameMatch,
            district_id: null,
            district_name: '',
            street_id: null,
            street_name: ''
        })
        onAddressChange?.(buildLocationLabel(regionId, null, null))
    }

    const handleDistrictChange = (e) => {
        const districtId = numOrNull(e.target.value)
        const districtNameMatch = districtId ? findDistrict(districtId)?.name || suppliedDistrictName : ''
        onChange({
            ...value,
            district_id: districtId,
            district_name: districtNameMatch,
            street_id: null,
            street_name: ''
        })
        onAddressChange?.(buildLocationLabel(value.region_id, districtId, null))
    }

    const handleStreetChange = (e) => {
        const streetId = numOrNull(e.target.value)
        const streetNameMatch = streetId ? findStreet(streetId)?.name || suppliedStreetName : ''
        onChange({
            ...value,
            street_id: streetId,
            street_name: streetNameMatch
        })
        onAddressChange?.(buildLocationLabel(value.region_id, value.district_id, streetId))
    }

    const regionHasValue = value.region_id != null && value.region_id !== ''
    const districtHasValue = value.district_id != null && value.district_id !== ''
    const streetHasValue = value.street_id != null && value.street_id !== ''

    const regionLabel = getRegionLabel(value.region_id)
    const districtLabel = getDistrictLabel(value.district_id)
    const streetLabel = getStreetLabel(value.street_id)

    return (
        <div className="space-y-3">
            <div>
                <label className="label">Viloyat</label>
                <select
                    className="input"
                    value={strOrEmpty(value.region_id)}
                    onChange={handleRegionChange}
                    required={required}
                >
                    <option value="">
                        {loadingRegions
                            ? 'Yuklanmoqda...'
                            : regions.length
                            ? 'Tanlang...'
                            : regionsError || 'Viloyatlar mavjud emas'}
                    </option>
                    {regionHasValue && regionLabel && (
                        <option value={strOrEmpty(value.region_id)} key="always-region">
                            {regionLabel}
                        </option>
                    )}
                    {regions.map(region => (
                        <option key={region.id} value={strOrEmpty(region.id)}>{region.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="label">Tuman</label>
                <select
                    className="input"
                    value={strOrEmpty(value.district_id)}
                    onChange={handleDistrictChange}
                    disabled={!regionHasValue || loadingDistricts}
                    required={required}
                >
                    <option value="">
                        {loadingDistricts
                            ? 'Yuklanmoqda...'
                            : regionHasValue
                            ? districts.length
                            ? 'Tanlang...'
                            : districtsError || 'Tumanlar mavjud emas'
                            : 'Avval viloyatni tanlang'}
                    </option>
                    {districtHasValue && districtLabel && (
                        <option value={strOrEmpty(value.district_id)} key="always-district">
                            {districtLabel}
                        </option>
                    )}
                    {districts.map(district => (
                        <option key={district.id} value={strOrEmpty(district.id)}>{district.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="label">Ko'cha/MFY</label>
                <select
                    className="input"
                    value={strOrEmpty(value.street_id)}
                    onChange={handleStreetChange}
                    disabled={!districtHasValue || loadingStreets}
                    required={required}
                >
                    <option value="">
                        {loadingStreets
                            ? 'Yuklanmoqda...'
                            : districtHasValue
                            ? streets.length
                            ? 'Tanlang...'
                            : streetsError || 'Koʻchalar mavjud emas'
                            : 'Avval tumanni tanlang'}
                    </option>
                    {streetHasValue && streetLabel && (
                        <option value={strOrEmpty(value.street_id)} key="always-street">
                            {streetLabel}
                        </option>
                    )}
                    {streets.map(street => (
                        <option key={street.id} value={strOrEmpty(street.id)}>{street.name}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}
