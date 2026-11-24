// Parcours fiche → page d'enquête → retour au schéma ; schémas Mermaid dessinés.
import { expect, test } from '@playwright/test'
import index from '../../content/enquetes.json' with { type: 'json' }

test('fiche → enquête → retour', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./?lang=fr')
  const link = page.locator('.fiche .enq a').first()
  await expect(link).toContainText('#12')
  await link.click()
  await expect(page).toHaveURL(/#\/enquete\/12$/)
  await expect(page.locator('.reader-main h1')).toContainText('tokenisation')
  await expect(page.locator('.reader-nav a')).toHaveCount(index.enquetes.length)
  await expect(page.locator('.prose h2').first()).toBeVisible()
  await page.locator('.reader-nav a', { hasText: '#14' }).click()
  await expect(page.locator('.prose .mermaid-fig svg')).toHaveCount(2, { timeout: 15000 })
  await page.locator('.reader-top .btn').click()
  await expect(page.locator('.timeline')).toBeVisible()
  expect(errors).toEqual([])
})
