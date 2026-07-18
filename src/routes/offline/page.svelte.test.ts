import { describe, test, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/svelte';
import Page from './+page.svelte';

describe('/offline/+page.svelte', () => {
	test('should render both players', () => {
		render(Page);
		expect(screen.getByText('Player 1')).toBeInTheDocument();
		expect(screen.getByText('Player 2')).toBeInTheDocument();
	});
});
