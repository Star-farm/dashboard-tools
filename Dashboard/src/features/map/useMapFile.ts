
import { useCallback, useEffect, useMemo, useState } from 'react'

// Cache parsed JSON
const cache = new Map<string, unknown>()

// Deduplicate in-flight requests
const pending = new Map<string, Promise<unknown>>()

async function loadMapFile<T>(
  filename: string
): Promise<T> {
  if (cache.has(filename)) {
    return cache.get(filename) as T
  }

  const existing = pending.get(filename)

  if (existing) {
    return existing as Promise<T>
  }

  const request = (async () => {
    const response = await fetch(
      `${import.meta.env.BASE_URL}map-data/${filename}`
    )

    if (!response.ok) {
      throw new Error(
        `Failed to load ${filename}: ${response.status}`
      )
    }

    const data = (await response.json()) as T

    cache.set(filename, data)

    return data
  })()

  pending.set(filename, request)

  try {
    return await request
  } finally {
    if (pending.get(filename) === request) {
      pending.delete(filename)
    }
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
  >({ key: '' })

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

    if (
      files.every((filename) => cache.has(filename))
    ) {
      return
    }

    let cancelled = false

    Promise.all(
      files.map((filename) =>
        loadMapFile<T>(filename)
      )
    )
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

    return () => {
      cancelled = true
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
