import { useState, useEffect } from 'react'
import { locationsApi } from '../api/locations.api'

export default function LocationSelector({
    value = { region_id: null, district_id: null, street_id: null },
    onChange,
    required = false
}) {
    const [regions, setRegions] = useState([])
    const [districts, setDistricts] = useState([])
    const [streets, setStreets] = useState([])
    const [loading, setLoading] = useState(false)

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
        try {
            const data = await locationsApi.getRegions()
            setRegions(Array.isArray(data) ? data : data.data || [])
        } catch (error) {
            console.error('Failed to load regions:', error)
        }
    }

    const loadDistricts = async (regionId) => {
        setLoading(true)
        try {
            const data = await locationsApi.getDistricts(regionId)
            setDistricts(Array.isArray(data) ? data : data.data || [])
        } catch (error) {
            console.error('Failed to load districts:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadStreets = async (districtId) => {
        setLoading(true)
        try {
            const data = await locationsApi.getStreets(districtId)
            setStreets(Array.isArray(data) ? data : data.data || [])
        } catch (error) {
            console.error('Failed to load streets:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleRegionChange = (e) => {
        const regionId = e.target.value ? parseInt(e.target.value) : null
        onChange({
            region_id: regionId,
            district_id: null,
            street_id: null
        })
    }

    const handleDistrictChange = (e) => {
        const districtId = e.target.value ? parseInt(e.target.value) : null
        onChange({
            ...value,
            district_id: districtId,
            street_id: null
        })
    }

    const handleStreetChange = (e) => {
        const streetId = e.target.value ? parseInt(e.target.value) : null
        onChange({
            ...value,
            street_id: streetId
        })
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
                    <option value="">Tanlang...</option>
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
                    disabled={!value.region_id || loading}
                    required={required}
                >
                    <option value="">Tanlang...</option>
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
                    disabled={!value.district_id || loading}
                    required={required}
                >
                    <option value="">Tanlang...</option>
                    {streets.map(street => (
                        <option key={street.id} value={street.id}>{street.name}</option>
                    ))}
                </select>
            </div>
        </div>
    )
}
