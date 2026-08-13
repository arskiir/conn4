import { expect, test } from '@playwright/test';

test('home page redirects to the offline game', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveURL(/\/offline/);
	await expect(page.getByText('Player 1')).toBeVisible();
	await expect(page.getByText('Player 2')).toBeVisible();
});
