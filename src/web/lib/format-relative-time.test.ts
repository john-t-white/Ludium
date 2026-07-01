import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './format-relative-time';

const NOW = new Date('2026-07-01T12:00:00.000Z');

describe('formatRelativeTime', () => {
	it('FormatRelativeTime_GivenInvalidDate_ExpectUnknownDate', () => {
		const invalidDate = new Date('not-a-date');

		expect(formatRelativeTime(invalidDate, NOW)).toBe('unknown date');
	});

	it('FormatRelativeTime_GivenSameInstant_ExpectJustNow', () => {
		expect(formatRelativeTime(NOW, NOW)).toBe('just now');
	});

	it('FormatRelativeTime_GivenThirtySecondsAgo_ExpectJustNow', () => {
		const date = new Date(NOW.getTime() - 30 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('just now');
	});

	it('FormatRelativeTime_GivenThirtySecondsInFuture_ExpectJustNow', () => {
		const date = new Date(NOW.getTime() + 30 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('just now');
	});

	it('FormatRelativeTime_GivenOneMinuteAgo_ExpectSingularMinute', () => {
		const date = new Date(NOW.getTime() - 60 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('1 minute ago');
	});

	it('FormatRelativeTime_GivenFiveMinutesAgo_ExpectPluralMinutes', () => {
		const date = new Date(NOW.getTime() - 5 * 60 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('5 minutes ago');
	});

	it('FormatRelativeTime_GivenOneHourAgo_ExpectSingularHour', () => {
		const date = new Date(NOW.getTime() - 60 * 60 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('1 hour ago');
	});

	it('FormatRelativeTime_GivenFiveHoursAgo_ExpectPluralHours', () => {
		const date = new Date(NOW.getTime() - 5 * 60 * 60 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('5 hours ago');
	});

	it('FormatRelativeTime_GivenTwentyThreeHoursAgo_ExpectHoursNotYesterday', () => {
		const date = new Date(NOW.getTime() - 23 * 60 * 60 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('23 hours ago');
	});

	it('FormatRelativeTime_GivenExactlyOneDayAgo_ExpectYesterday', () => {
		const date = new Date(NOW.getTime() - 24 * 60 * 60 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('yesterday');
	});

	it('FormatRelativeTime_GivenTwoDaysAgo_ExpectPluralDays', () => {
		const date = new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('2 days ago');
	});

	it('FormatRelativeTime_GivenSixDaysAgo_ExpectPluralDays', () => {
		const date = new Date(NOW.getTime() - 6 * 24 * 60 * 60 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('6 days ago');
	});

	it('FormatRelativeTime_GivenSevenDaysAgo_ExpectAbsoluteDateFallback', () => {
		const date = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('Jun 24, 2026');
	});

	it('FormatRelativeTime_GivenDateFarInPast_ExpectAbsoluteDateFallback', () => {
		const date = new Date('2020-01-15T12:00:00.000Z');

		expect(formatRelativeTime(date, NOW)).toBe('Jan 15, 2020');
	});

	it('FormatRelativeTime_GivenFutureDateBeyondJustNowWindow_ExpectAbsoluteDateFallback', () => {
		const date = new Date(NOW.getTime() + 5 * 60 * 1000);

		expect(formatRelativeTime(date, NOW)).toBe('Jul 1, 2026');
	});

	it('FormatRelativeTime_GivenNoNowArgument_ExpectDefaultsToCurrentTime', () => {
		const date = new Date();

		expect(formatRelativeTime(date)).toBe('just now');
	});
});
