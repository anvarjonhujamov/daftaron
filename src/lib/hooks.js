import { useCallback, useEffect, useRef, useState } from 'react'
import { readCache, writeCache } from './cache'

// Ma'lumot yuklash: cacheKey berilsa avval keshdan chiziladi, keyin fonda yangilanadi.
// deps o'zgarsa qayta yuklanadi; eski so'rov javobi yangisini bosib ketmaydi.
export function useResource(fetcher, deps = [], { cacheKey, enabled = true } = {}) {
    const [state, setState] = useState(() => ({
        data: cacheKey ? readCache(cacheKey) : null,
        error: null,
        loading: enabled
    }))
    const seq = useRef(0)
    const fetchRef = useRef(fetcher)
    fetchRef.current = fetcher

    const load = useCallback(async () => {
        if (!enabled) return
        const id = ++seq.current
        setState((s) => ({ ...s, loading: true, error: null }))
        try {
            const data = await fetchRef.current()
            if (id !== seq.current) return
            if (cacheKey) writeCache(cacheKey, data)
            setState({ data, error: null, loading: false })
        } catch (error) {
            if (id !== seq.current) return
            setState((s) => ({ ...s, error, loading: false }))
        }
    }, [cacheKey, enabled, ...deps])

    useEffect(() => { load() }, [load])

    const setData = useCallback((updater) => setState((s) => ({
        ...s, data: typeof updater === 'function' ? updater(s.data) : updater
    })), [])

    return { ...state, reload: load, setData }
}

export function useDebounced(value, delay = 300) {
    const [v, setV] = useState(value)
    useEffect(() => {
        const t = setTimeout(() => setV(value), delay)
        return () => clearTimeout(t)
    }, [value, delay])
    return v
}

export function useOnline() {
    const [online, setOnline] = useState(() => navigator.onLine)
    useEffect(() => {
        const on = () => setOnline(true)
        const off = () => setOnline(false)
        window.addEventListener('online', on)
        window.addEventListener('offline', off)
        return () => {
            window.removeEventListener('online', on)
            window.removeEventListener('offline', off)
        }
    }, [])
    return online
}

// Nasiya/to'lov saqlanganda ochiq sahifalar ma'lumotni yangilaydi
const CHANGE_EVENT = 'dc:changed'
export const emitChange = (what = 'all') => window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: what }))

export function useOnChange(callback) {
    const ref = useRef(callback)
    ref.current = callback
    useEffect(() => {
        const handler = (e) => ref.current(e.detail)
        window.addEventListener(CHANGE_EVENT, handler)
        return () => window.removeEventListener(CHANGE_EVENT, handler)
    }, [])
}

export function useMediaQuery(query) {
    const [match, setMatch] = useState(() => window.matchMedia(query).matches)
    useEffect(() => {
        const mq = window.matchMedia(query)
        const handler = () => setMatch(mq.matches)
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [query])
    return match
}
