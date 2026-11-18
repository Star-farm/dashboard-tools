import { expect, test, type Page } from 'playwright/test'

async function expectMobileMapControls(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 })
  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) throw new Error(`Missing map control: ${selector}`)
      const { x, y, width, height, right } = element.getBoundingClientRect()
      return { x, y, width, height, right, centerY: y + height / 2 }
    }
    return {
      controls: rect('.map-time-controls'),
      play: rect('.map-time-controls .map-play'),
      season: rect('.map-time-controls .map-season-control'),
      label: rect('.map-time-controls .map-season-control label'),
      select: rect('.map-time-controls .map-season-control select'),
    }
  })

  expect(Math.abs(geometry.label.centerY - geometry.select.centerY), `label and dropdown should share a row at ${width}px`).toBeLessThanOrEqual(4)
  expect(Math.abs(geometry.play.centerY - geometry.season.centerY), `play button should align with the harvest control at ${width}px`).toBeLessThanOrEqual(4)
  expect(geometry.select.x).toBeGreaterThan(geometry.label.right)
  expect(geometry.select.width).toBeLessThan(geometry.season.width)
  expect(geometry.select.right).toBeLessThanOrEqual(geometry.season.right + 1)
  expect(geometry.controls.right).toBeLessThanOrEqual(width + 1)
  await page.setViewportSize({ width: 1440, height: 900 })
}

const viewports = [320, 375, 390, 430, 768, 1024, 1440]
const routes = [
  '#home', '#glossary', '#future', '#map-explore', '#map', '#soil-map',
  '#economics-explore', '#economics-explore-overview', '#economics-explore-comparison', '#economics-explore-bau',
  '#economics-overview', '#economics-comparison', '#economics-bau3-vs-1mha', '#economics-bau2-vs-1mha', '#economics-bauss-vs-1mha',
  '#economics-bau3', '#economics-bau2', '#economics-bauss', '#economics-1mha',
  '#resources-explore', '#resources-explore-overview', '#resources-explore-comparison', '#resources-explore-bau',
  '#resources-overview', '#resources-comparison', '#resources-bau3-vs-1mha', '#resources-bau2-vs-1mha', '#resources-bauss-vs-1mha',
  '#resources-bau3', '#resources-bau2', '#resources-bauss', '#resources-1mha',
  '#environment-explore', '#environment-explore-overview', '#environment-explore-comparison', '#environment-explore-bau',
  '#environment-overview', '#environment-comparison', '#environment-bau3-vs-1mha', '#environment-bau2-vs-1mha', '#environment-bauss-vs-1mha',
  '#environment-bau3', '#environment-bau2', '#environment-bauss', '#environment-1mha', '#scenario-details',
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

    if (route === '#map') {
      await expectMobileMapControls(page, 320)
      await expectMobileMapControls(page, 375)
    }
    const englishHeading = await heading.textContent()
    const englishTitle = await page.title()
    await page.getByRole('button', { name: 'Tiếng Việt' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi')
    await expect(page.getByRole('navigation', { name: 'Menu chính' })).toBeVisible()
    await expect(heading).not.toHaveText(englishHeading ?? '')
    await expect(page).not.toHaveTitle(englishTitle)
    if (route === '#map') {
      await expectMobileMapControls(page, 320)
      await expectMobileMapControls(page, 375)
      const firstPlot = page.getByRole('button', { name: 'Vùng 0' })
      await firstPlot.focus()
      await firstPlot.press('Enter')
      await expect(page.getByRole('dialog')).toContainText('Thông tin thửa đất')
    }
    if (route === '#soil-map') {
      await page.getByRole('button', { name: 'Sử dụng đất' }).click()
      await expect(page.getByRole('complementary')).toContainText('Sử dụng đất')
      await expect(page.locator('.plot-map-svg image')).toHaveCount(1)
    }
    for (const width of viewports) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 })
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), {
        message: `${route} should not overflow horizontally in Vietnamese at ${width}px`,
      }).toBe(true)
      if (width === 375) await page.screenshot({ path: `test-results/responsive/${route.slice(1)}-vi-${width}.png`, fullPage: true })
    }
    const vietnameseHeading = await heading.textContent()
    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    await expect(heading).toHaveText(englishHeading ?? '')
    await expect(heading).not.toHaveText(vietnameseHeading ?? '')

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
