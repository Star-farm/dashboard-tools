import { expect, test } from 'playwright/test'

const viewports = [320, 375, 390, 430, 768, 1024, 1440]
const routes = [
  '#home', '#future', '#map-explore', '#map', '#soil-map',
  '#economics-overview', '#resources-overview', '#environment-overview', '#scenario-details',
]

for (const route of routes) {
  test(`${route} fits the requested responsive viewports`, async ({ page }) => {
    const runtimeErrors: string[] = []
    const failedRequests: string[] = []
    const dataRequests: string[] = []
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()}`))
    page.on('request', (request) => dataRequests.push(request.url()))
    if (route === '#map') {
      await page.route('**/map-data/admin-boundaries.geojson', async (requestRoute) => {
        const response = await requestRoute.fetch()
        const boundaries = await response.json()
        for (const feature of boundaries.features) {
          if (feature.properties.kind === 'ward') feature.properties.fullName = 'A very long commune and ward name that must wrap cleanly onto two lines in a narrow plot popup'
        }
        await requestRoute.fulfill({ response, json: boundaries })
      })
    }

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await page.getByRole('button', { name: 'English' }).click()
    await page.goto(route)
    const heading = page.getByRole('heading', { level: 1 }).first()
    await expect(heading).toBeVisible()
    await expect(heading).not.toHaveText('')
    await page.evaluate(() => document.fonts.ready)

    for (const width of viewports) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 })
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), {
        message: `${route} should not overflow horizontally at ${width}px`,
      }).toBe(true)
      if (width === 375) {
        await page.screenshot({ path: `test-results/responsive/${route.slice(1)}-${width}.png`, fullPage: true })
      }
    }

    expect(runtimeErrors, `${route} runtime errors`).toEqual([])
    expect(failedRequests, `${route} failed requests`).toEqual([])
    if (route === '#soil-map') {
      expect(dataRequests.some((url) => url.endsWith('/soil-overlay.json'))).toBe(false)
      await expect(page.getByRole('button', { name: 'Land use' })).toBeVisible()
      await page.getByRole('button', { name: 'Land use' }).click()
      await expect(page.locator('.plot-map-svg image')).toHaveCount(1)
      await expect(page.getByRole('complementary')).toContainText('Land use')
      expect(dataRequests.some((url) => url.endsWith('/soil-overlay.json'))).toBe(false)
    }
    if (route === '#map') {
      await page.setViewportSize({ width: 320, height: 844 })
      await expect(page.locator('.plot-map-svg')).toBeVisible()
      const firstPlot = page.getByRole('button', { name: 'Area 0' })
      await firstPlot.focus()
      await firstPlot.press('Enter')
      const wardName = page.getByRole('dialog').locator('.plot-map-popup-ward-name')
      await expect(wardName).toBeVisible()
      const layout = await wardName.evaluate((element) => {
        const style = getComputedStyle(element)
        return { clamp: style.webkitLineClamp, lineHeight: parseFloat(style.lineHeight), height: element.getBoundingClientRect().height }
      })
      expect(layout.clamp).toBe('2')
      expect(layout.height).toBeLessThanOrEqual(layout.lineHeight * 2 + 1)
      await page.screenshot({ path: 'test-results/responsive/map-popup-320.png', fullPage: true })
    }
  })
}
