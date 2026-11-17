import { StrictMode, type ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMapFile } from '../src/features/map/useMapFile'

afterEach(() => vi.unstubAllGlobals())

describe('map file loading', () => {
  it('shares an in-flight request and keeps it alive while another consumer remains', async () => {
    let finish!: (value: Response) => void
    const fetch = vi.fn((url: string, options: RequestInit) => new Promise<Response>((resolve) => { void url; void options; finish = resolve }))
    vi.stubGlobal('fetch', fetch)
    const first = renderHook(() => useMapFile<{ value: number }>('shared-cache-test.json'))
    const second = renderHook(() => useMapFile<{ value: number }>('shared-cache-test.json'))
    expect(fetch).toHaveBeenCalledTimes(1)
    const signal = fetch.mock.calls[0][1].signal as AbortSignal
    first.unmount()
    await act(async () => { await Promise.resolve() })
    expect(signal.aborted).toBe(false)
    await act(async () => { finish({ ok: true, json: async () => ({ value: 7 }) } as Response) })
    await waitFor(() => expect(second.result.current.data?.value).toBe(7))
    second.unmount()
  })

  it('aborts obsolete requests and does not cache a late response', async () => {
    let finish!: (value: Response) => void
    const fetch = vi.fn((url: string, options: RequestInit) => new Promise<Response>((resolve) => { void url; void options; finish = resolve }))
    vi.stubGlobal('fetch', fetch)
    const hook = renderHook(() => useMapFile('obsolete-cache-test.json'))
    const signal = fetch.mock.calls[0][1].signal as AbortSignal
    hook.unmount()
    await act(async () => { await Promise.resolve() })
    expect(signal.aborted).toBe(true)
    await act(async () => { finish({ ok: true, json: async () => ({ value: 1 }) } as Response); await Promise.resolve() })
    const next = renderHook(() => useMapFile('obsolete-cache-test.json'))
    expect(fetch).toHaveBeenCalledTimes(2)
    next.unmount()
  })

  it('evicts old files and keeps StrictMode requests usable', async () => {
    const fetch = vi.fn(async (url: string) => ({ ok: true, json: async () => ({ url }) }) as Response)
    vi.stubGlobal('fetch', fetch)
    const wrapper = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>
    const hook = renderHook(({ name }) => useMapFile<{ url: string }>(name), { initialProps: { name: 'bounded-cache-test-0.json' }, wrapper })
    for (let i = 0; i < 10; i++) {
      const name = `bounded-cache-test-${i}.json`
      hook.rerender({ name })
      await waitFor(() => expect(hook.result.current.data?.url).toContain(name))
    }
    hook.rerender({ name: 'bounded-cache-test-0.json' })
    await waitFor(() => expect(hook.result.current.data?.url).toContain('bounded-cache-test-0.json'))
    expect(fetch.mock.calls.filter(([url]) => url.includes('bounded-cache-test-0.json'))).toHaveLength(2)
    hook.unmount()
  })
})
