import { useEffect, useState } from 'react'
import { locationsApi } from '../api/settings.api'
import { readCache, writeCache } from '../lib/cache'
import { Select } from '../ui/controls'

const asList = (r) => (Array.isArray(r) ? r : r?.data || [])

// Ro'yxatlar kam o'zgaradi — keshdan, bo'lmasa API'dan
const cached = (key, fetcher) => {
    const hit = readCache(key)
    if (hit) return Promise.resolve(hit)
    return fetcher().then((r) => { const list = asList(r); writeCache(key, list); return list })
}

// Viloyat → tuman → MFY (ixtiyoriy). value: { region_id, district_id, street_id }
export default function LocationFields({ value, onChange, withStreet = true, errors = {} }) {
    const [regions, setRegions] = useState([])
    const [districts, setDistricts] = useState([])
    const [streets, setStreets] = useState([])

    useEffect(() => { cached('loc_regions', locationsApi.regions).then(setRegions).catch(() => {}) }, [])
    useEffect(() => {
        setDistricts([])
        if (value.region_id) cached(`loc_d_${value.region_id}`, () => locationsApi.districts(value.region_id)).then(setDistricts).catch(() => {})
    }, [value.region_id])
    useEffect(() => {
        setStreets([])
        if (withStreet && value.district_id) cached(`loc_s_${value.district_id}`, () => locationsApi.streets(value.district_id)).then(setStreets).catch(() => {})
    }, [value.district_id, withStreet])

    const opts = (list) => list.map((x) => ({ value: x.id, label: x.name }))
    const num = (v) => (v ? Number(v) : null)

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Viloyat" options={opts(regions)} value={value.region_id} error={errors.region_id}
                onChange={(v) => onChange({ region_id: num(v), district_id: null, street_id: null })} />
            <Select label="Tuman" options={opts(districts)} value={value.district_id} error={errors.district_id} disabled={!value.region_id}
                onChange={(v) => onChange({ ...value, district_id: num(v), street_id: null })} />
            {withStreet && (
                <Select label="MFY" className="sm:col-span-2" options={opts(streets)} value={value.street_id} disabled={!value.district_id}
                    onChange={(v) => onChange({ ...value, street_id: num(v) })} />
            )}
        </div>
    )
}
