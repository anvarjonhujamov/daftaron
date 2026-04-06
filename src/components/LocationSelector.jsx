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

    const getRegionName = (id) => regions.find((region) => region.id === id)?.name || ''
    const getDistrictName = (id) => districts.find((district) => district.id === id)?.name || ''
    const getStreetName = (id) => streets.find((street) => street.id === id)?.name || ''

    const buildLocationLabel = (regionId, districtId, streetId) => {
        const parts = []
        const regionName = getRegionName(regionId)
        const districtName = getDistrictName(districtId)
        const streetName = getStreetName(streetId)
        if (regionName) parts.push(regionName)
        if (districtName) parts.push(districtName)
        if (streetName) parts.push(streetName)
        return parts.join(', ')
    }

    useEffect(() => {
        loadRegions()
    }, [])

    useEffect(() => {
        if (value.region_id) {
            loadDistricts(value.region_id)
        } else {
            setDistricts([])
            setStreets([])
        }
    }, [value.region_id])

    useEffect(() => {
        if (value.district_id) {
            loadStreets(value.district_id)
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
        const regionId = e.target.value ? parseInt(e.target.value) : null
        onChange({
            region_id: regionId,
            district_id: null,
            street_id: null
        })
        onAddressChange?.(buildLocationLabel(regionId, null, null))
    }

    const handleDistrictChange = (e) => {
        const districtId = e.target.value ? parseInt(e.target.value) : null
        onChange({
            ...value,
            district_id: districtId,
            street_id: null
        })
        onAddressChange?.(buildLocationLabel(value.region_id, districtId, null))
    }

    const handleStreetChange = (e) => {
        const streetId = e.target.value ? parseInt(e.target.value) : null
        onChange({
            ...value,
            street_id: streetId
        })
        onAddressChange?.(buildLocationLabel(value.region_id, value.district_id, streetId))
    }

    return (
        <div className="space-y-3">
            <div>
                <label className="label">Viloyat</label>
                <select
                    className="input"
                    value={value.region_id || ''}
                    onChange={handleRegionChange}
                    required={required}
                >
                    <option value="">{loadingRegions ? 'Yuklanmoqda...' : regions.length ? 'Tanlang...' : regionsError || 'Viloyatlar mavjud emas'}</option>
                    {regions.map(region => (
                        <option key={region.id} value={region.id}>{region.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="label">Tuman</label>
                <select
                    className="input"
                    value={value.district_id || ''}
                    onChange={handleDistrictChange}
                    disabled={!value.region_id || loadingDistricts}
                    required={required}
                >
                    <option value="">{loadingDistricts ? 'Yuklanmoqda...' : value.region_id ? districts.length ? 'Tanlang...' : districtsError || 'Tumanlar mavjud emas' : 'Avval viloyatni tanlang'}</option>
                    {districts.map(district => (
                        <option key={district.id} value={district.id}>{district.name}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="label">Ko'cha/MFY</label>
                <select
                    className="input"
                    value={value.street_id || ''}
                    onChange={handleStreetChange}
                    disabled={!value.district_id || loadingStreets}
                    required={required}
                >
                    <option value="">{loadingStreets ? 'Yuklanmoqda...' : value.district_id ? streets.length ? 'Tanlang...' : streetsError || 'Koʻchalar mavjud emas' : 'Avval tumanni tanlang'}</option>
                    {streets.map(street => (
                        <option key={street.id} value={street.id}>{street.name}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}
