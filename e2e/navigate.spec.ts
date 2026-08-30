import { expect, test } from '@playwright/test'
import { signInAs } from './auth'
import { SEED_USERS } from './seed-users'

test('visiting /navigate directly redirects to the map', async ({ context, page }) => {
  await signInAs(context, SEED_USERS[0])

  await page.goto('/navigate')

  await expect(page).toHaveURL('/')
})

test('opening a saved route and clicking Navigate opens live navigation', async ({
  context,
  page,
}) => {
  await signInAs(context, SEED_USERS[0])
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 52.52, longitude: 13.405 })

  await page.route('**/api/routing/saved-routes/*', async (route) => {
    await route.fulfill({
      json: {
        id: 'fake-route',
        name: 'Commute',
        originLabel: 'Origin St',
        destinationLabel: 'Destination Ave',
        route: {
          kind: 'recommended',
          path: [
            { lat: 52.52, lng: 13.405 },
            { lat: 52.521, lng: 13.406 },
            { lat: 52.522, lng: 13.407 },
          ],
          distanceMeters: 500,
          durationSeconds: 120,
        },
      },
    })
  })
  await page.route('**/api/routing/elevation', async (route) => {
    await route.fulfill({
      json: {
        samples: [],
        ascentMeters: 0,
        descentMeters: 0,
        minElevationMeters: 0,
        maxElevationMeters: 0,
      },
    })
  })

  await page.goto('/?routeId=fake-route')
  await expect(page.getByText('Commute')).toBeVisible()

  await page.getByRole('button', { name: 'Navigate' }).click()

  await expect(page).toHaveURL('/navigate?routeId=fake-route')
  await expect(page.getByText('Origin St → Destination Ave')).toBeVisible()
  await expect(page.getByText(/km/)).toBeVisible()

  await page.getByRole('button', { name: 'Stop navigation' }).click()
  await expect(page).toHaveURL('/')
})

test('a shared /navigate?routeId= link opens live navigation on a fresh visit', async ({
  context,
  page,
}) => {
  await signInAs(context, SEED_USERS[0])
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 52.52, longitude: 13.405 })

  await page.route('**/api/routing/saved-routes/*', async (route) => {
    await route.fulfill({
      json: {
        id: 'fake-route',
        name: 'Commute',
        originLabel: 'Origin St',
        destinationLabel: 'Destination Ave',
        route: {
          kind: 'recommended',
          path: [
            { lat: 52.52, lng: 13.405 },
            { lat: 52.521, lng: 13.406 },
            { lat: 52.522, lng: 13.407 },
          ],
          distanceMeters: 500,
          durationSeconds: 120,
        },
      },
    })
  })

  await page.goto('/navigate?routeId=fake-route')

  await expect(page).toHaveURL('/navigate?routeId=fake-route')
  await expect(page.getByText('Origin St → Destination Ave')).toBeVisible()
})

test('drifting off the route shows the off-route guide', async ({ context, page }) => {
  await signInAs(context, SEED_USERS[0])
  await context.grantPermissions(['geolocation'])
  // Well off the path below, which runs due north around lng 13.405-13.407.
  await context.setGeolocation({ latitude: 52.521, longitude: 13.42 })

  await page.route('**/api/routing/saved-routes/*', async (route) => {
    await route.fulfill({
      json: {
        id: 'fake-route',
        name: 'Commute',
        originLabel: 'Origin St',
        destinationLabel: 'Destination Ave',
        route: {
          kind: 'recommended',
          path: [
            { lat: 52.52, lng: 13.405 },
            { lat: 52.521, lng: 13.406 },
            { lat: 52.522, lng: 13.407 },
          ],
          distanceMeters: 500,
          durationSeconds: 120,
        },
      },
    })
  })

  await page.goto('/navigate?routeId=fake-route')

  await expect(page.getByText(/off route — follow the red line back/)).toBeVisible()
})

test('"Get back on track" fetches a routed path back to the route', async ({
  context,
  page,
}) => {
  await signInAs(context, SEED_USERS[0])
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 52.521, longitude: 13.42 })

  await page.route('**/api/routing/saved-routes/*', async (route) => {
    await route.fulfill({
      json: {
        id: 'fake-route',
        name: 'Commute',
        originLabel: 'Origin St',
        destinationLabel: 'Destination Ave',
        route: {
          kind: 'recommended',
          path: [
            { lat: 52.52, lng: 13.405 },
            { lat: 52.521, lng: 13.406 },
            { lat: 52.522, lng: 13.407 },
          ],
          distanceMeters: 500,
          durationSeconds: 120,
        },
      },
    })
  })

  let findRouteCalls = 0
  await page.route('**/api/routing/find-route', async (route) => {
    findRouteCalls++
    await route.fulfill({
      json: {
        routes: [
          {
            kind: 'recommended',
            path: [
              { lat: 52.521, lng: 13.42 },
              { lat: 52.5215, lng: 13.415 },
              { lat: 52.522, lng: 13.407 },
            ],
            distanceMeters: 900,
            durationSeconds: 200,
          },
        ],
      },
    })
  })

  await page.goto('/navigate?routeId=fake-route')
  await expect(page.getByRole('button', { name: 'Get back on track' })).toBeVisible()

  await Promise.all([
    page.waitForResponse('**/api/routing/find-route'),
    page.getByRole('button', { name: 'Get back on track' }).click(),
  ])

  expect(findRouteCalls).toBe(1)
})

test('a /navigate?routeId= link for a route that fails to load falls back to the map', async ({
  context,
  page,
}) => {
  await signInAs(context, SEED_USERS[0])

  await page.route('**/api/routing/saved-routes/*', async (route) => {
    await route.fulfill({ status: 404, json: { statusMessage: 'errors.notFound' } })
  })

  await page.goto('/navigate?routeId=missing-route')

  await expect(page).toHaveURL('/?routeId=missing-route')
})
