import { expect, test } from '@playwright/test'
import { signInAs } from './auth'
import { SEED_USERS } from './seed-users'

test('a signed-in user can open /routes and sees the empty state', async ({
  context,
  page,
}) => {
  await signInAs(context, SEED_USERS[0])

  await page.goto('/routes')

  await expect(page.getByRole('heading', { name: 'My Routes' })).toBeVisible()
  await expect(page.getByText('No saved routes yet')).toBeVisible()
})

test('the map page links to /routes', async ({ context, page }) => {
  await signInAs(context, SEED_USERS[0])

  await page.goto('/')
  await page.getByRole('link', { name: 'My Routes' }).click()

  await expect(page).toHaveURL('/routes')
})
