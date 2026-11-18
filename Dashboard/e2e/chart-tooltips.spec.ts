import { expect, test } from 'playwright/test'

const widths = [320, 375, 390, 430, 768, 1440]
const charts = [
  { name: 'line', route: '#economics-bau3', selector: '.bau3-plot .recharts-wrapper', layout: '.bau3-plot .recharts-wrapper' },
  { name: 'bar', route: '#economics-comparison', selector: '.comparison-plot .recharts-bar-rectangle', layout: '.comparison-plot .recharts-wrapper' },
  { name: 'seasonal pie', route: '#economics-bau3', selector: '.seasonal-pie-canvas .recharts-pie-sector', layout: '.seasonal-pie-canvas .recharts-wrapper' },
  { name: 'map trend', route: '#map', selector: '.map-trend-chart .recharts-wrapper', layout: '.map-trend-chart .recharts-wrapper' },
] as const

for (const chart of charts) {
  test(`${chart.name} tooltip fits the viewport in both languages`, async ({ page }) => {
    const errors: string[] = []
    const failedRequests: string[] = []
    page.on('pageerror', (error) => {
      if (!error.message.includes('Transition was aborted because of timeout in DOM update')) errors.push(error.message)
    })
    page.on('requestfailed', (request) => failedRequests.push(request.url()))
    await page.goto('/')
    await page.getByRole('button', { name: 'English' }).click()
    await page.goto(chart.route)

    if (chart.name === 'seasonal pie') {
      await page.locator('.analysis-view-switch button').nth(1).click()
      await expect(page.locator('.seasonal-pie-canvas .recharts-pie-sector').first()).toBeVisible()
    }

    for (const width of widths) {
      await page.mouse.move(0, 0)
      await page.setViewportSize({ width, height: 900 })
      await page.locator(chart.layout).first().evaluate(async (element) => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
        if (element.getBoundingClientRect().width <= 0) throw new Error('Chart has no visible width after resizing')
      })
      for (const language of ['English', 'Tiếng Việt']) {
        const lang = language === 'English' ? 'en' : 'vi'
        if (width > 767) {
          const switcher = page.locator(`.desktop-header .language-switcher button[lang="${lang}"]`)
          if (await switcher.getAttribute('aria-pressed') !== 'true') await switcher.click()
          await expect(switcher).toHaveAttribute('aria-pressed', 'true')
        } else {
          await page.locator('.mobile-menu-toggle').click()
          const switcher = page.locator(`.mobile-menu-language .language-switcher button[lang="${lang}"]`)
          if (await switcher.getAttribute('aria-pressed') !== 'true') await switcher.click()
          await expect(switcher).toHaveAttribute('aria-pressed', 'true')
          await page.locator('.mobile-menu-close').click()
        }
        const target = page.locator(chart.selector).first()
        await expect(target).toBeVisible()
        await target.scrollIntoViewIfNeeded()
        if (chart.name === 'seasonal pie') {
          const point = await target.locator('path').first().evaluate((path) => {
            const length = (path as SVGPathElement).getTotalLength()
            const position = (path as SVGPathElement).getPointAtLength(length * .25)
            const svg = path.ownerSVGElement!
            const bounds = svg.getBoundingClientRect()
            return { x: bounds.left + position.x * bounds.width / Number(svg.getAttribute('width')), y: bounds.top + position.y * bounds.height / Number(svg.getAttribute('height')) }
          })
          await page.mouse.move(point.x, point.y)
        } else await target.hover()

        const tooltip = page.locator('.chart-info, .seasonal-pie-tooltip, .map-trend-chart .recharts-default-tooltip').first()
        await expect(tooltip).toBeVisible()
        const bounds = await tooltip.evaluate((element) => {
          const rect = element.getBoundingClientRect()
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
        })
        expect(bounds.left).toBeGreaterThanOrEqual(-1)
        expect(bounds.right).toBeLessThanOrEqual(width + 1)
        expect(bounds.top).toBeGreaterThanOrEqual(-1)
        expect(bounds.bottom).toBeLessThanOrEqual(901)

        const unitSelector = chart.name === 'seasonal pie' ? '.seasonal-pie-tooltip-unit' : '.chart-info-unit'
        const hiddenUnit = await page.locator(unitSelector).first().evaluate((element) => getComputedStyle(element).display === 'none')
        expect(hiddenUnit).toBe(chart.name !== 'seasonal pie' && width <= 767)
        if (chart.name === 'bar') {
          await expect(page.locator('.chart-info dd').first()).toContainText(/\d/)
          const swatch = await page.locator('.chart-info-swatch').first().evaluate((element) => getComputedStyle(element).backgroundColor)
          expect(swatch).not.toBe('rgba(0, 0, 0, 0)')
          if (width <= 767) await expect(page.locator('.chart-tooltip-mobile-label').first()).toHaveText('BAU')
          else await expect(page.locator('.chart-tooltip-desktop-label').first()).toContainText(/Business as usual|Thường lệ/)
        }
        if (chart.name === 'seasonal pie') {
          const compactName = page.locator('.seasonal-pie-tooltip-mobile-name').first()
          const fullName = page.locator('.seasonal-pie-tooltip-desktop-name').first()
          if (width <= 767) {
            await expect(compactName).toBeVisible()
            await expect(compactName).toContainText('BAU')
            await expect(fullName).toBeHidden()
          } else {
            await expect(fullName).toBeVisible()
            await expect(compactName).toBeHidden()
          }
        }
        await page.screenshot({ path: `test-results/tooltips/${chart.name.replaceAll(' ', '-')}-${width}-${language === 'English' ? 'en' : 'vi'}.png` })
      }
    }
    expect(errors).toEqual([])
    expect(failedRequests).toEqual([])
  })
}
