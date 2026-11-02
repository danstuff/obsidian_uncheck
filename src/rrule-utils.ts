import { Options, RRule } from 'rrule';

// Parsing the same period text happens on every scan for every matching item,
// so cache the (cheap but non-trivial) natural-language parse result.
const parseCache = new Map<string, Partial<Options> | null>();

function parsePeriod(periodText: string): Partial<Options> | null {
	const key = periodText.trim().toLowerCase();
	const cached = parseCache.get(key);
	if (cached !== undefined) return cached;

	let opts: Partial<Options> | null;
	try {
		opts = RRule.parseText(periodText) ?? null;
		if (opts && opts.freq === undefined) opts = null;
	} catch {
		opts = null;
	}
	parseCache.set(key, opts);
	return opts;
}

/** Returns true if `periodText` is a recognized recurrence rule. */
export function canParsePeriod(periodText: string): boolean {
	return parsePeriod(periodText) !== null;
}

const MS_PER_MINUTE = 60 * 1000;

/**
 * Parses an `HH:MM` (24-hour) time of day into minutes after midnight.
 * Returns null if the text isn't a valid time.
 */
export function parseTimeOfDay(text: string): number | null {
	const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
	if (!match) return null;
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	if (hours > 23 || minutes > 59) return null;
	return hours * 60 + minutes;
}

/**
 * rrule does its date math in UTC, so to keep occurrences on local wall-clock
 * times across DST changes we use its "floating time" convention: a Date
 * whose UTC fields hold the local wall-clock fields.
 */
function toFloating(date: Date): Date {
	return new Date(
		Date.UTC(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
			date.getHours(),
			date.getMinutes(),
			date.getSeconds(),
			date.getMilliseconds(),
		),
	);
}

/** Inverse of `toFloating`: interprets the UTC fields as local time. */
function fromFloating(date: Date): Date {
	return new Date(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
		date.getUTCHours(),
		date.getUTCMinutes(),
		date.getUTCSeconds(),
		date.getUTCMilliseconds(),
	);
}

/** Midnight on the same (floating) day as `date`. */
function startOfFloatingDay(date: Date): Date {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Finds the most recent recurrence at or before `now`, anchored at the start
 * of `baseline`'s day. Anchoring to the start of the day (rather than the
 * exact time `baseline` represents) keeps daily/weekly/monthly rules aligned
 * to calendar days instead of the wall-clock time an item happened to be
 * first seen or last unchecked.
 *
 * `dayStartMinutes` sets when a "day" begins, in minutes after local
 * midnight. For example, with 240 (04:00) a day runs from 4am to 4am, so a
 * daily item checked at 1am still counts as done for the previous day and
 * unchecks at 4am. This is implemented by shifting wall-clock times back by
 * the offset, computing occurrences against midnight-aligned days, then
 * shifting the result forward again.
 *
 * Returns null if `periodText` can't be parsed, or if no occurrence has
 * happened yet.
 */
export function mostRecentOccurrence(
	periodText: string,
	baseline: Date,
	now: Date,
	dayStartMinutes = 0,
): Date | null {
	const opts = parsePeriod(periodText);
	if (!opts) return null;
	const offsetMs = dayStartMinutes * MS_PER_MINUTE;
	const shiftedBaseline = new Date(toFloating(baseline).getTime() - offsetMs);
	const shiftedNow = new Date(toFloating(now).getTime() - offsetMs);
	const rule = new RRule({ ...opts, dtstart: startOfFloatingDay(shiftedBaseline) });
	const occurrence = rule.before(shiftedNow, true);
	return occurrence ? fromFloating(new Date(occurrence.getTime() + offsetMs)) : null;
}
