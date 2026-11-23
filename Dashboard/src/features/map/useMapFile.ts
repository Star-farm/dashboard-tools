
import { useCallback, useEffect, useMemo, useState } from 'react'


const MAX_CACHED_FILES = 8
const cache = new Map<string, unknown>()

type PendingRequest = {
  controller: AbortController
  consumers: number
  promise: Promise<unknown>
}

const pending = new Map<string, PendingRequest>()

function acquireMapFile<T>(filename: string): { promise: Promise<T>; release: () => void } {
  if (cache.has(filename)) {
    return { promise: Promise.resolve(cache.get(filename) as T), release: () => {} }
  }

  let entry = pending.get(filename)
  if (!entry) {
    const controller = new AbortController()
    const promise = (async () => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}map-data/${filename}`,
        { signal: controller.signal }
      )
      if (!response.ok) throw new Error(`Failed to load ${filename}: ${response.status}`)
      const data = await response.json() as T
      if (controller.signal.aborted) throw new DOMException('Request aborted', 'AbortError')
      cache.delete(filename)
      cache.set(filename, data)
      while (cache.size > MAX_CACHED_FILES) cache.delete(cache.keys().next().value!)
      return data
    })()
    entry = { controller, consumers: 0, promise }
    pending.set(filename, entry)
    const request = entry
    void promise.then(
      () => { if (pending.get(filename) === request) pending.delete(filename) },
      () => { if (pending.get(filename) === request) pending.delete(filename) },
    )
  }
  const request = entry
  request.consumers++
  let released = false
  return {
    promise: request.promise as Promise<T>,
    release: () => {
      if (released) return
      released = true
      request.consumers--
      queueMicrotask(() => {
        if (request.consumers === 0 && pending.get(filename) === request) {
          pending.delete(filename)
          request.controller.abort()
        }
      })
    },
  }
}

type MapFilesResult<T> = {
  key: string
  data?: T[]
  error?: boolean
}

export function useMapFiles<T>(
  filenames: readonly string[]
) {
  const [attempt, setAttempt] = useState(0)

  const [result, setResult] = useState<
    MapFilesResult<T>
  >(() => filenames.length && filenames.every((filename) => cache.has(filename))
    ? { key: `${JSON.stringify(filenames)}:0`, data: filenames.map((filename) => cache.get(filename) as T) }
    : { key: '' })

  const fileKey = JSON.stringify(filenames)

  const key = `${fileKey}:${attempt}`

  const files = useMemo(
    () => JSON.parse(fileKey) as string[],
    [fileKey]
  )

  const data = useMemo(() => {
    if (files.length === 0) {
      return undefined
    }

    if (
      files.every((filename) => cache.has(filename))
    ) {
      return files.map(
        (filename) => cache.get(filename) as T
      )
    }

    return result.key === key
      ? result.data
      : undefined
  }, [files, key, result])

  useEffect(() => {
    if (!files.length) return

    let cancelled = false

    const requests = files.map((filename) => acquireMapFile<T>(filename))
    const release = () => requests.forEach((request) => request.release())
    Promise.all(requests.map((request) => request.promise))
      .then((loaded) => {
        if (cancelled) return

        setResult({
          key,
          data: loaded,
          error: false,
        })
      })
      .catch((error) => {
        if (cancelled) return

        console.error('Map loading failed:', error)

        setResult({
          key,
          error: true,
        })
      })
      .finally(release)

    return () => {
      cancelled = true
      release()
    }
  }, [files, key, attempt])

  const retry = useCallback(() => {
    for (const filename of files) cache.delete(filename)
    setAttempt((current) => current + 1)
  }, [files])

  return {
    data,
    previousData: result.data,
    error:
      !data &&
      result.key === key &&
      result.error === true,
    retry,
  }
}

export function useMapFile<T>(
  filename: string | undefined
) {
  const filenames = useMemo(
    () => (filename ? [filename] : []),
    [filename]
  )

  const result = useMapFiles<T>(filenames)

  return {
    ...result,
    data: result.data?.[0],
    previousData: result.previousData?.[0],
  }
}
