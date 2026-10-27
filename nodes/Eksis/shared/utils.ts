import type { IDataObject } from 'n8n-workflow';

const PLATFORM_LABELS: Record<string, string> = {
	bluesky: 'Bluesky',
	devto: 'DEV',
	facebook: 'Facebook',
	google_business: 'Google Business Profile',
	instagram: 'Instagram',
	linkedin: 'LinkedIn',
	pinterest: 'Pinterest',
	shopee: 'Shopee',
	threads: 'Threads',
	tiktok: 'TikTok',
	x: 'X',
	youtube: 'YouTube',
};

export function platformLabel(platform: unknown): string {
	return PLATFORM_LABELS[String(platform)] ?? String(platform);
}

/** Accepts `id1, id2`, a single id, or an array from an expression. */
export function splitIds(value: unknown): string[] {
	if (Array.isArray(value))
		return value
			.map(String)
			.map((v) => v.trim())
			.filter(Boolean);
	if (typeof value !== 'string') return [];
	return value
		.split(',')
		.map((v) => v.trim())
		.filter(Boolean);
}

export function clip(text: unknown, max = 60): string {
	const value = String(text ?? '')
		.replace(/\s+/g, ' ')
		.trim();
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Offset of `timeZone` from UTC at the instant `ts`, in milliseconds. */
function zoneOffset(ts: number, timeZone: string): number {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	}).formatToParts(new Date(ts));
	const part = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((p) => p.type === type)?.value ?? 0);
	const wall = Date.UTC(
		part('year'),
		part('month') - 1,
		part('day'),
		part('hour'),
		part('minute'),
		part('second'),
	);
	return wall - Math.floor(ts / 1000) * 1000;
}

/**
 * The eksis API reads a time without an offset as UTC, while n8n date pickers
 * give the wall time of the workflow. A value that already carries `Z` or an
 * offset is kept as it is.
 */
export function toInstant(value: unknown, timeZone: string): string | null {
	const text = String(value ?? '').trim();
	if (!text) return null;
	if (/(z|[+-]\d{2}:?\d{2})$/i.test(text)) {
		const parsed = Date.parse(text);
		return Number.isNaN(parsed) ? text : new Date(parsed).toISOString();
	}

	const [datePart, timePart = '00:00:00'] = text.split(/[T ]/);
	const asUtc = Date.parse(`${datePart}T${timePart}Z`);
	if (Number.isNaN(asUtc)) return text;

	const first = asUtc - zoneOffset(asUtc, timeZone);
	const second = asUtc - zoneOffset(first, timeZone);
	return new Date(second).toISOString();
}

/** At most ten fields, the ones a workflow usually needs, with the author flattened. */
export function simplifyComment(comment: IDataObject): IDataObject {
	const author = (comment.author ?? {}) as IDataObject;
	return {
		id: comment.id,
		text: comment.text,
		status: comment.status,
		isHidden: comment.isHidden,
		platform: comment.platform,
		channelId: comment.channelId,
		authorUsername: comment.authorUsername ?? author.username ?? null,
		authorName: comment.authorName ?? author.name ?? null,
		postId: comment.postId ?? null,
		createdAt: comment.createdAt ?? null,
	};
}
