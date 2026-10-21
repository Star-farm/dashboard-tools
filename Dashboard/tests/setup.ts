import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

afterEach(cleanup)

beforeEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
  window.history.replaceState(null, '', '#glossary')
  vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['vi-VN'])
})
