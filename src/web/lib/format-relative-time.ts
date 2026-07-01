const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Formats `date` as a human-friendly string relative to `now` (defaults to the current time).
 *
 * Rules:
 * - Less than 60 seconds away (past or future): 'just now'
 * - Less than 60 minutes: 'X minute(s) ago'
 * - Less than 24 hours: 'X hour(s) ago'
 * - Exactly 1 day ago: 'yesterday'
 * - 2-6 days ago: 'X days ago'
 * - 7+ days ago, or any future date beyond 60 seconds: a short absolute date (e.g. 'Jan 5, 2026')
 * - Invalid `date`: 'unknown date'
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
	if (Number.isNaN(date.getTime())) {
		return 'unknown date';
	}

	const diffMs = now.getTime() - date.getTime();

	if (Math.abs(diffMs) < MINUTE_MS) {
		return 'just now';
	}

	if (diffMs < 0) {
		return formatAbsoluteDate(date);
	}

	if (diffMs < HOUR_MS) {
		const minutes = Math.floor(diffMs / MINUTE_MS);
		return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
	}

	if (diffMs < DAY_MS) {
		const hours = Math.floor(diffMs / HOUR_MS);
		return `${hours} hour${hours === 1 ? '' : 's'} ago`;
	}

	const days = Math.floor(diffMs / DAY_MS);

	if (days === 1) {
		return 'yesterday';
	}

	if (days <= 6) {
		return `${days} days ago`;
	}

	return formatAbsoluteDate(date);
}

function formatAbsoluteDate(date: Date): string {
	return new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	}).format(date);
}
