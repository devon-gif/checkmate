import { test, expect } from '@playwright/test'

// ─── A. Homepage loads ────────────────────────────────────────────────────────
test('A — homepage loads with hero', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/CheckRay|Ray/i)
  await expect(page.getByRole('link', { name: /start free trial/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /see how ray works/i })).toBeVisible()
})

// ─── B. "Start free trial" routes to /sign-up ─────────────────────────────────
test('B — Start free trial links to /sign-up', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /start free trial/i }).first().click()
  await expect(page).toHaveURL(/\/sign-up/)
})

// ─── C. Sign-up page renders auth form ────────────────────────────────────────
test('C — sign-up page renders', async ({ page }) => {
  await page.goto('/sign-up')
  // Should show a form, not the AuthSetupNotice
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
})

// ─── D. Sign-in page renders auth form ────────────────────────────────────────
test('D — sign-in page renders', async ({ page }) => {
  await page.goto('/sign-in')
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
})

// ─── E. Anonymous check on /try ───────────────────────────────────────────────
test('E — anonymous check returns a result', async ({ page }) => {
  await page.goto('/try')
  const textarea = page.getByRole('textbox').first()
  await textarea.fill(
    "You're hired for a remote data entry role. We'll send a check for equipment. Deposit it and wire the difference back."
  )
  await page.getByRole('button', { name: /ask ray/i }).click()

  // Wait up to 30 s for the result (AI call)
  await expect(page.getByText(/very.?high|high risk/i)).toBeVisible({ timeout: 30_000 })
})

// ─── F. Second anonymous check triggers gate ──────────────────────────────────
test('F — second anonymous check shows upgrade gate', async ({ page }) => {
  // First check
  await page.goto('/try')
  await page.getByRole('textbox').first().fill('Test message one')
  await page.getByRole('button', { name: /ask ray/i }).click()
  await page.waitForLoadState('networkidle')

  // Second check — navigate back and submit again
  await page.goto('/try')
  await page.getByRole('textbox').first().fill('Test message two')
  await page.getByRole('button', { name: /ask ray/i }).click()

  await expect(
    page.getByText(/free check|create.*account|sign in/i)
  ).toBeVisible({ timeout: 15_000 })
})

// ─── J. Pricing page renders ─────────────────────────────────────────────────
test('J — pricing page renders plan cards', async ({ page }) => {
  await page.goto('/pricing')
  await expect(page.getByText(/basic/i)).toBeVisible()
  await expect(page.getByText(/plus/i)).toBeVisible()
})

// ─── Auth smoke (requires TEST_USER_EMAIL / TEST_USER_PASSWORD secrets) ───────
test.describe('Auth smoke (requires secrets)', () => {
  test.skip(
    !process.env.TEST_USER_EMAIL,
    'Set TEST_USER_EMAIL and TEST_USER_PASSWORD to run auth tests'
  )

  test('K — sign in and reach dashboard', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('textbox', { name: /email/i }).fill(process.env.TEST_USER_EMAIL!)
    await page.getByLabel(/password/i).fill(process.env.TEST_USER_PASSWORD!)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
  })
})
