const { test, expect } = require('@playwright/test');

// Note: Ensure your local React server (localhost:5173) is running during tests.
// The tests will intercept backend API calls so the backend does not need to be running.

test.describe('Omni-SRE End-to-End Test Suite', () => {

  test('test_auth_and_router_bounce', async ({ page }) => {
    // 1. Intercept Supabase Auth session call to return a mocked authenticated session
    await page.route('**/auth/v1/user*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock_user_123',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'test@example.com'
        })
      });
    });

    // We also need to inject session directly into localStorage for Supabase SDK
    await page.addInitScript(() => {
       window.localStorage.setItem('sb-llmwpsevcdgxclrkwyvp-auth-token', JSON.stringify({
         access_token: 'mock_token',
         refresh_token: 'mock_refresh',
         user: { id: 'mock_user_123', email: 'test@example.com' }
       }));
    });

    // 2. Mock the workspace fetch query
    await page.route('**/rest/v1/workspaces*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'workspace_123', name: 'Tenant A', created_by: 'mock_user_123' }])
      });
    });

    // 3. Navigate to root
    await page.goto('http://localhost:5173/');

    // 4. Assert seamless redirect to Dashboard without permanent hang
    await expect(page).toHaveURL(/.*\/workspace\/workspace_123/);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('test_audit_log_creation', async ({ page }) => {
    // Setup initial workspace state
    await page.addInitScript(() => {
       window.localStorage.setItem('sb-llmwpsevcdgxclrkwyvp-auth-token', JSON.stringify({
         access_token: 'mock_token',
         refresh_token: 'mock_refresh',
         user: { id: 'mock_user_123', email: 'test@example.com' }
       }));
    });

    // Mock API Review Stream Endpoint
    await page.route('http://localhost:8000/api/review/stream', async route => {
      // Create a mock Server-Sent Event stream
      const sseBody = `data: {"system_msg": "Initializing..."}\n\ndata: {"content": "## Vulnerability found"}\n\ndata: {"content": "\\n\\nFix this SQL injection"}\n\ndata: {"done": true, "stats": {"findings_count": 1}}\n\n`;
      
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: sseBody
      });
    });

    // Mock the Supabase INSERT for the review audit log
    await page.route('**/rest/v1/reviews*', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 201, body: JSON.stringify({}) });
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
      }
    });

    // Navigate straight to the "New Review" page for isolated testing
    await page.goto('http://localhost:5173/workspace/workspace_123/review/new');

    // Fill in the diff payload
    await page.fill('textarea[placeholder*="--- a/src/index.js"]', 'var dangerous = \"hello\";');

    // Start stream
    const submitBtn = page.getByRole('button', { name: /Start Agentic Review/i });
    await submitBtn.click();

    // Assert that the terminal renders the "Initializing..." message
    await expect(page.locator('text=Initializing...')).toBeVisible();

    // Because the stream finishes instantly in the mock, it should transition to complete state
    await expect(page.locator('text=✅ Review complete! Found 1 critical issues.')).toBeVisible();

    // Assert the Markdown successfully rendered the content
    // We injected: "## Vulnerability found\n\nFix this SQL injection"
    const markdownBox = page.locator('.review-markdown');
    await expect(markdownBox).toBeVisible();
    await expect(markdownBox).toContainText('Vulnerability found');
    await expect(markdownBox).toContainText('Fix this SQL injection');

    // Wait for the Dashboard redirect button to appear
    await expect(page.getByRole('button', { name: /Back to Dashboard/i })).toBeVisible();
  });

  test('test_memory_bleed_ui', async ({ page }) => {
    // Setup user session
    await page.addInitScript(() => {
       window.localStorage.setItem('sb-llmwpsevcdgxclrkwyvp-auth-token', JSON.stringify({
         access_token: 'mock_token',
         refresh_token: 'mock_refresh',
         user: { id: 'user_a', email: 'user_a@example.com' }
       }));
    });

    // Mock Supabase returning an empty array for this specific Tenant B URL
    // (This exactly mimics Row Level Security blocking access)
    await page.route('**/rest/v1/workspaces?id=eq.tenant_b_id*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])  // Empty array implies No Access
      });
    });

    // User navigates directly to Tenant B's Dashboard URL
    await page.goto('http://localhost:5173/workspace/tenant_b_id');

    // Depending on frontend architecture, it might render "Workspace Not Found", "Unauthorized", 
    // or bounce them back to root. The platform currently has an 'isError' state when it can't find the workspace context.
    await expect(page.locator('text=Error loading workspace')).toBeVisible(); 
  });
});
