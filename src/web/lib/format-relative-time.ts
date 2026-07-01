const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const SHORT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
};

/**
 * Formats `date` relative to `now` (defaults to the current time) as a human-friendly string:
 * - 'just now' for differences under 60 seconds
 * - 'X minute(s) ago' for differences under an hour
 * - 'X hour(s) ago' for differences under a day
 * - 'yesterday' for a difference of exactly one day
 * - 'X day(s) ago' for differences of up to 6 days
 * - a short absolute date (e.g. 'Jan 5, 2026') for anything older, and for future or invalid dates
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
	if (Number.isNaN(date.getTime()) || Number.isNaN(now.getTime())) {
		return 'unknown date';
	}

	const diffMs = now.getTime() - date.getTime();

	if (diffMs < 0) {
		return formatShortDate(date);
	}

	if (diffMs < MINUTE_MS) {
		return 'just now';
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

	return formatShortDate(date);
}

function formatShortDate(date: Date): string {
	return new Intl.DateTimeFormat('en-US', SHORT_DATE_FORMAT).format(date);
}
