import { useEffect, useMemo, useState } from 'react'

const cache = new Map<string, unknown>()

export function useMapFiles<T>(filenames: readonly string[]) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; data?: T[]; error?: boolean }>({ key: '' })
  const fileKey = JSON.stringify(filenames)
  const key = `${fileKey}:${attempt}`
  const data = useMemo(() => {
    const files = JSON.parse(fileKey) as string[]
    if (files.length && files.every((file) => cache.has(file))) return files.map((file) => cache.get(file) as T)
    return result.key === key ? result.data : undefined
  }, [fileKey, key, result])
  useEffect(() => {
    const files = JSON.parse(fileKey) as string[]
    if (!files.length || files.every((file) => cache.has(file))) return
    const controller = new AbortController()
    Promise.all(files.map(async (filename) => {
      if (cache.has(filename)) return cache.get(filename) as T
      const response = await fetch(`${import.meta.env.BASE_URL}map-data/${filename}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Map data: ${response.status}`)
      const value = await response.json() as T
      if (!controller.signal.aborted) cache.set(filename, value)
      return value
    }))
      .then((data) => {
        if (controller.signal.aborted) return
        setResult({ key, data })
      })
      .catch(() => { if (!controller.signal.aborted) setResult({ key, error: true }) })
    return () => controller.abort()
  }, [fileKey, key])
  return { data, error: !data && result.key === key && result.error, retry: () => setAttempt((value) => value + 1) }
}

export function useMapFile<T>(filename: string | undefined) {
  const result = useMapFiles<T>(filename ? [filename] : [])
  return { ...result, data: result.data?.[0] }
}
