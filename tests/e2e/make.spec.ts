// M4 : la comparaison base / Instruct affichée = traces.
import { expect, test } from '@playwright/test'
import index from '../../public/traces/index.json' with { type: 'json' }

const pctFr = (p: number) => `${(p * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
const get = (id: string) => (index as any[]).find((x) => x.id === id)

test('fine-tuning : probabilités base et Instruct = traces', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('./?phase=make&lang=fr')
  await page.locator('.tl-seg', { hasText: '4.' }).click()
  const rows = page.locator('.step-body .ctable tbody tr')
  await expect(rows).toHaveCount(5)
  const i = get('3b-instruct-en-capital'), b = get('3b-base-en-capital')
  const tgt = i.top5[0]
  const cells = (await rows.first().locator('td.mono:not(.small)').allTextContents()).map((s) => s.replace(/ /g, ' '))
  expect(cells).toEqual([pctFr(b.top5.find((x: any) => x.id === tgt.id).p), pctFr(tgt.p)])
  await page.locator('.tl-seg', { hasText: '3.' }).click()
  await expect(page.locator('.facts')).toContainText('3,21')
  expect(errors).toEqual([])
})
