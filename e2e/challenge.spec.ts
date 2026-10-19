import AxeBuilder from '@axe-core/playwright'
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

test('home and challenge pages have no automated accessibility violations', async ({ page }) => {
  await page.goto('/')
  const homeResults = await new AxeBuilder({ page }).analyze()
  expect(homeResults.violations).toEqual([])

  await page.goto('/#/day/01')
  const challengeResults = await new AxeBuilder({ page }).analyze()
  expect(challengeResults.violations).toEqual([])
})
