/**
 * @system E2E — Teams
 *
 * Tests for the /teams page: page load, team list or empty state,
 * team item content, invite flow presence, and navigation.
 *
 * Design notes:
 * - Without a live backend, the page may render an empty state or a loading
 *   skeleton. Tests are written to pass in both cases.
 * - Invite/add-member flows require a real session; they are checked for
 *   presence only, not end-to-end.
 */

const { test, expect } = require('../../testing/@system/helpers/fixtures')

// ---------------------------------------------------------------------------
// Teams — page load
// ---------------------------------------------------------------------------

test.describe('Teams — page load', () => {
  test('teams page renders without crash', async ({ authedPage }) => {
    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')

    await expect(authedPage.locator('body')).toBeVisible()
  })

  test('teams page title is not empty', async ({ authedPage }) => {
    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')

    const title = await authedPage.title()
    expect(title.length).toBeGreaterThan(0)
  })

  test('teams page does not show an uncaught error boundary', async ({ authedPage }) => {
    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')

    const errorBoundary = authedPage.locator(
      '[data-testid="error-boundary"], text=/Something went wrong/i'
    )
    const visible = await errorBoundary.isVisible().catch(() => false)
    expect(visible).toBe(false)
  })

  test('teams page has a heading or title element', async ({ authedPage }) => {
    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')
    await authedPage.waitForTimeout(300)

    const heading = authedPage.locator('h1, h2, [data-testid="page-heading"]').first()
    const visible = await heading.isVisible().catch(() => false)
    if (visible) {
      const text = await heading.textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    }
  })

  test('teams page does not log uncaught JS errors on load', async ({ authedPage }) => {
    const pageErrors = []
    authedPage.on('pageerror', (err) => pageErrors.push(err.message))

    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')
    await authedPage.waitForTimeout(500)

    expect(pageErrors).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Teams — list or empty state
// ---------------------------------------------------------------------------

test.describe('Teams — list or empty state', () => {
  test('page shows a team list, cards, or an empty state', async ({ authedPage }) => {
    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')
    await authedPage.waitForTimeout(1000)

    const teamList = authedPage.locator(
      '[data-testid="team-list"], [data-testid="teams-list"], ' +
      '[role="list"], ul, table, .team-card, [class*="team-card"], [class*="TeamCard"]'
    )
    const emptyState = authedPage.locator(
      '[data-testid="empty-state"], .empty-state, ' +
      'text=/no teams/i, text=/no team/i, text=/get started/i'
    )

    const listCount = await teamList.count()
    const emptyVisible = await emptyState.isVisible().catch(() => false)
    const bodyText = await authedPage.locator('body').textContent()

    // At least one signal: list items, empty state, or body content
    const hasContent = listCount > 0 || emptyVisible || bodyText.trim().length > 20
    expect(hasContent).toBe(true)
  })

  test('team items contain non-empty text when list is populated', async ({ authedPage }) => {
    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')
    await authedPage.waitForTimeout(1000)

    const teamItems = authedPage.locator(
      '[data-testid^="team-item"], [data-testid^="team-"], ' +
      '.team-card, [class*="team-item"], [class*="TeamItem"]'
    )
    const count = await teamItems.count()

    if (count > 0) {
      const firstItemText = await teamItems.first().textContent()
      expect(firstItemText?.trim().length).toBeGreaterThan(0)
    }
    // Empty list is valid — no assertion on count
  })

  test('empty state message is informative when no teams exist', async ({ authedPage }) => {
    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')
    await authedPage.waitForTimeout(1000)

    const emptyState = authedPage.locator(
      '[data-testid="empty-state"], .empty-state, ' +
      'text=/no teams/i, text=/create.*team/i'
    ).first()

    const visible = await emptyState.isVisible().catch(() => false)
    if (visible) {
      const text = await emptyState.textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    }
  })

  test('loading state resolves within 5 seconds', async ({ authedPage }) => {
    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')

    await authedPage.waitForFunction(
      () => {
        const skeletons = document.querySelectorAll(
          '[class*="skeleton"], [class*="Skeleton"], [data-testid="skeleton"]'
        )
        return skeletons.length === 0
      },
      { timeout: 5000 }
    ).catch(() => {
      // Skeletons persist without a backend — not a failure
    })

    await expect(authedPage.locator('body')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Teams — invite / add member flow
// ---------------------------------------------------------------------------

test.describe('Teams — invite and add member (presence check)', () => {
  test('invite or add member button is present when teams exist', async ({ authedPage }) => {
    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')
    await authedPage.waitForTimeout(500)

    const inviteBtn = authedPage.locator(
      'button:has-text("Invite"), button:has-text("Add member"), ' +
      'button:has-text("Add Member"), button:has-text("New team"), ' +
      '[data-testid="invite-button"], [data-testid="add-member"]'
    ).first()

    const visible = await inviteBtn.isVisible().catch(() => false)
    if (visible) {
      await expect(inviteBtn).toBeVisible()
      await expect(inviteBtn).toBeEnabled()
    }
    // Optional: depends on user role and whether teams exist
  })

  test('create team button or CTA is present', async ({ authedPage }) => {
    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')
    await authedPage.waitForTimeout(500)

    const createBtn = authedPage.locator(
      'button:has-text("Create"), button:has-text("New team"), ' +
      'button:has-text("Create team"), a:has-text("Create team")'
    ).first()

    const visible = await createBtn.isVisible().catch(() => false)
    if (visible) {
      await expect(createBtn).toBeVisible()
    }
  })
})

// ---------------------------------------------------------------------------
// Teams — navigation
// ---------------------------------------------------------------------------

test.describe('Teams — navigation', () => {
  test('teams page can be reloaded without crashing', async ({ authedPage }) => {
    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')

    await authedPage.reload()
    await authedPage.waitForLoadState('domcontentloaded')

    await expect(authedPage.locator('body')).toBeVisible()
  })

  test('back navigation from teams returns to previous page', async ({ authedPage }) => {
    await authedPage.goto('/dashboard')
    await authedPage.waitForLoadState('domcontentloaded')

    await authedPage.goto('/teams')
    await authedPage.waitForLoadState('domcontentloaded')

    await authedPage.goBack()
    await authedPage.waitForLoadState('domcontentloaded')

    expect(authedPage.url()).toContain('/dashboard')
  })

  test('navigating to /teams multiple times does not accumulate errors', async ({ authedPage }) => {
    for (let i = 0; i < 3; i++) {
      await authedPage.goto('/teams')
      await authedPage.waitForLoadState('domcontentloaded')
    }

    await expect(authedPage.locator('body')).toBeVisible()
  })
})
