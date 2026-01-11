
import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    // Note: Adjust the expected title based on your actual application title
    await expect(page).toHaveTitle(/Ohmybutler/);
});

test('get started link', async ({ page }) => {
    await page.goto('/');

    // Example test - adjust based on your actual UI content
    // await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible(); 
});
