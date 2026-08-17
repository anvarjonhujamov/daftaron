import { useState, useEffect, useMemo } from 'react'
import { locationsApi } from '../api/locations.api'

const numOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null
    const n = parseInt(v, 10)
    return Number.isFinite(n) ? n : null
}
const strOrEmpty = (v) => (v === null || v === undefined || v === '' ? '' : String(v))

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

    const regionId = numOrNull(value.region_id)
    const districtId = numOrNull(value.district_id)
    const streetId = numOrNull(value.street_id)

    const suppliedRegionName = String(value?.region_name || value?.regionName || value?.region || (typeof value?.region === 'object' ? value?.region?.name : '') || '')
    const suppliedDistrictName = String(value?.district_name || value?.districtName || value?.district || (typeof value?.district === 'object' ? value?.district?.name : '') || '')
    const suppliedStreetName = String(value?.street_name || value?.streetName || value?.street || (typeof value?.street === 'object' ? value?.street?.name : '') || '')

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
            setLoadingRegions(true)
            setRegionsError('')
            try {
                const data = await locationsApi.getRegions()
                setRegions(Array.isArray(data) ? data : data?.data || [])
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
            setLoadingDistricts(true)
            setDistrictsError('')
            try {
                const data = await locationsApi.getDistricts(regionId)
                if (mounted) setDistricts(Array.isArray(data) ? data : data?.data || [])
            } catch (error) {
                console.error('Failed to load districts:', error)
                if (mounted) {
                    setDistricts([])
                    setDistrictsError('Tumanlar yuklanmadi')
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
            setLoadingStreets(true)
            setStreetsError('')
            try {
                const data = await locationsApi.getStreets(districtId)
                if (mounted) setStreets(Array.isArray(data) ? data : data?.data || [])
            } catch (error) {
                console.error('Failed to load streets:', error)
                if (mounted) {
                    setStreets([])
                    setStreetsError('Koʻchalar yuklanmadi')
                }
            } finally {
                if (mounted) setLoadingStreets(false)
            }
        })()
        return () => { mounted = false }
    }, [districtId])

    const handleRegionChange = (e) => {
        const next = numOrNull(e.target.value)
        const nextName = next ? (regions.find((r) => numOrNull(r.id) === next)?.name || suppliedRegionName || '') : ''
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
        const nextName = next ? (districts.find((d) => numOrNull(d.id) === next)?.name || suppliedDistrictName || '') : ''
        onChange({
            ...value,
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
        const nextName = next ? (streets.find((s) => numOrNull(s.id) === next)?.name || suppliedStreetName || '') : ''
        onChange({
            ...value,
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
                        <option value={regionSelectValue} key={`s-region-${regionSelectValue}`}>
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
                        <option value={districtSelectValue} key={`s-district-${districtSelectValue}`}>
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
                        <option value={streetSelectValue} key={`s-street-${streetSelectValue}`}>
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
