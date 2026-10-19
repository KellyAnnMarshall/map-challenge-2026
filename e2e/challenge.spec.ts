import AxeBuilder from '@axe-core/playwright'
import type { Map as MapboxMap } from 'mapbox-gl'
import { expect, test } from '@playwright/test'

test('home page links to all 30 daily challenges', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /30 maps\./ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Daily map challenges' }).getByRole('link')).toHaveCount(
    30,
  )
})

test('the introduction link scrolls to the prompt calendar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /EXPLORE THE PROMPTS/ }).click()

  await expect(page.locator('#calendar')).toBeInViewport()
})

test('a daily prompt can be opened and navigated directly', async ({ page }) => {
  await page.goto('/#/day/30')

  await expect(page.getByRole('heading', { name: 'Pen & paper.' })).toBeVisible()
  await expect(page.getByText(/Time to wrap up the challenge/)).toBeVisible()
  await expect(page.getByRole('link', { name: /DAY 29 · Raster/ })).toBeVisible()
})

test('Day 1 loads the local lighthouse points and synchronizes search with feature details', async ({
  page,
}) => {
  await page.goto('/#/day/01')

  await expect(page.getByRole('heading', { name: 'Keepers of the light.' })).toBeVisible()
  await expect(page.getByText('228', { exact: true })).toBeVisible()
  if (await page.getByRole('button', { name: 'Reset view' }).count()) {
    await expect(page.locator('.mapboxgl-canvas')).toBeVisible()
    await expect(page.locator('.mapboxgl-ctrl-attrib-inner')).toBeVisible()
    const zoomOut = page.getByRole('button', { name: 'Zoom out' })
    await expect(zoomOut).toBeDisabled({ timeout: 15000 })
  }

  const search = page.getByRole('searchbox', { name: 'Search lighthouse results' })
  await expect(search).toBeVisible()
  await search.fill('Wick South')
  await expect(page.getByText('1 RESULTS')).toBeVisible()
  const result = page.getByRole('button', { name: /Wick South/ })
  await expect(result).toBeVisible()
  if (await page.getByRole('button', { name: 'Reset view' }).count()) {
    const point = await page.evaluate(async () => {
      const explorer = document.querySelector('.lighthouse-explorer') as
        | (HTMLElement & {
            __vueParentComponent?: { setupState: { map?: MapboxMap } }
          })
        | null
      const map = explorer?.__vueParentComponent?.setupState.map
      if (!map) return undefined

      await new Promise<void>((resolve) => {
        map.easeTo({ center: [-3.0788798, 58.4390491], zoom: 14, duration: 0 })
        map.once('idle', () => resolve())
      })

      const feature = map
        .queryRenderedFeatures({ layers: ['lighthouse-unclustered'] })
        .find((candidate) => candidate.properties?.['name'] === 'Wick South')
      if (!feature || feature.geometry.type !== 'Point') return undefined

      const { x, y } = map.project(feature.geometry.coordinates)
      return { x, y }
    })
    expect(point).toBeDefined()
    await page.locator('.lighthouse-map-canvas').click({ position: point })
    await expect(page.getByRole('heading', { name: 'Wick South' })).toBeVisible()
    await expect(result).toHaveAttribute('aria-pressed', 'true')
  }
  await result.click()

  await expect(page.getByRole('heading', { name: 'Wick South' })).toBeVisible()
  await expect(page.getByText('green', { exact: true })).toHaveCount(2)
  await expect(page.getByRole('link', { name: 'OPEN IN OPENSTREETMAP' })).toHaveAttribute(
    'href',
    'https://www.openstreetmap.org/node/17898241',
  )

  await search.fill('')
  await page.getByLabel('Filter by ruin status').selectOption('ruins')
  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(2)
})

test('mobile feature details open as a dismissible overlay', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#/day/01')

  if (await page.getByRole('button', { name: 'Reset view' }).count()) {
    const point = await page.evaluate(async () => {
      const explorer = document.querySelector('.lighthouse-explorer') as
        | (HTMLElement & {
            __vueParentComponent?: { setupState: { map?: MapboxMap } }
          })
        | null
      const map = explorer?.__vueParentComponent?.setupState.map
      if (!map) return undefined

      await new Promise<void>((resolve) => {
        map.easeTo({ center: [-3.0788798, 58.4390491], zoom: 14, duration: 0 })
        map.once('idle', () => resolve())
      })

      const feature = map
        .queryRenderedFeatures({ layers: ['lighthouse-unclustered'] })
        .find((candidate) => candidate.properties?.['name'] === 'Wick South')
      if (!feature || feature.geometry.type !== 'Point') return undefined

      const { x, y } = map.project(feature.geometry.coordinates)
      return { x, y }
    })
    expect(point).toBeDefined()
    await page.locator('.lighthouse-map-canvas').click({ position: point })
    await expect(page.getByRole('dialog', { name: 'Wick South' })).toBeVisible()
    await page.getByRole('button', { name: 'Close feature details' }).last().click()
  }

  const result = page.getByRole('button', { name: /Wick South/ })
  await result.click()

  const dialog = page.getByRole('dialog', { name: 'Wick South' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  const panel = dialog.locator('.lighthouse-detail-panel')
  const box = await panel.boundingBox()
  expect(box).toBeDefined()
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.y + box!.height).toBeLessThanOrEqual(844)

  await page.getByRole('button', { name: 'Close feature details' }).last().click()
  await expect(dialog).toBeHidden()

  await result.click()
  await page.getByRole('button', { name: 'Close details' }).click()
  await expect(dialog).toBeHidden()
})

test('home and challenge pages have no automated accessibility violations', async ({ page }) => {
  await page.goto('/')
  const homeResults = await new AxeBuilder({ page }).analyze()
  expect(homeResults.violations).toEqual([])

  await page.goto('/#/day/01')
  const challengeResults = await new AxeBuilder({ page }).analyze()
  expect(challengeResults.violations).toEqual([])
})
