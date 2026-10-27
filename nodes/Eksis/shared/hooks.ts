import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { eksisApiRequest } from './transport';
import { simplifyComment, splitIds, toInstant } from './utils';

type PostMode = 'draft' | 'schedule' | 'queue' | 'now';

interface PostTarget {
	channelId: string;
	contentType?: string;
	caption: string | null;
	mediaIds: string[];
	firstComment: string | null;
	settings?: IDataObject;
	status: string;
}

interface CurrentPost {
	title: string | null;
	caption: string;
	mediaIds: string[];
	status: string;
	scheduledAt: string | null;
	targets: PostTarget[];
}

interface PostFields {
	caption?: string;
	channelIds?: string[];
	firstComment?: string;
	mediaIds?: string | string[];
	title?: string;
}

function scheduledAt(this: IExecuteSingleFunctions): string {
	const instant = toInstant(this.getNodeParameter('scheduledAt', ''), this.getTimezone());
	if (!instant) {
		throw new NodeOperationError(this.getNode(), "Set 'Scheduled Time' to schedule the post", {
			itemIndex: this.getItemIndex(),
			description: "Pick a date and time, or change 'Timing' to another option.",
		});
	}
	return instant;
}

/** Body for `POST /v1/posts`: one target per chosen channel, sharing caption and media. */
export async function buildCreatePostBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const channelIds = splitIds(this.getNodeParameter('channelIds', []));
	if (channelIds.length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			"Choose at least one channel in 'Channel Names or IDs'",
			{
				itemIndex: this.getItemIndex(),
				description:
					'A post needs a channel to go out on. Connect one in eksis if the list is empty.',
			},
		);
	}

	const mode = this.getNodeParameter('mode', 'draft') as PostMode;
	const extra = this.getNodeParameter('additionalFields', {}) as PostFields;
	const firstComment = extra.firstComment || null;

	const body: IDataObject = {
		caption: this.getNodeParameter('caption', '') as string,
		mediaIds: splitIds(extra.mediaIds),
		targets: channelIds.map((channelId) => ({ channelId, firstComment })),
		mode,
	};
	if (extra.title) body.title = extra.title;
	if (mode === 'schedule') body.scheduledAt = scheduledAt.call(this);

	requestOptions.body = body;
	return requestOptions;
}

/**
 * `PATCH /v1/posts/:id` replaces the whole post, so the current post is read
 * first and only the fields set in 'Update Fields' change. Channels that stay
 * keep their post type, own caption, media, and settings. A new caption or new
 * media applies to every channel, which clears the per-channel versions. The
 * timing stays: a draft stays a draft and a scheduled post keeps its time.
 */
export async function buildUpdatePostBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const fields = this.getNodeParameter('updateFields', {}) as PostFields;
	if (Object.keys(fields).length === 0) {
		throw new NodeOperationError(
			this.getNode(),
			"Add a field under 'Update Fields' to change the post",
			{
				itemIndex: this.getItemIndex(),
			},
		);
	}

	const postId = this.getNodeParameter('postId', '', { extractValue: true }) as string;
	const { data: current } = (await eksisApiRequest.call(
		this,
		'GET',
		`/posts/${encodeURIComponent(postId)}`,
	)) as unknown as { data: CurrentPost };

	const live = current.targets.filter((t) => t.status !== 'cancelled');
	const byChannel = new Map(live.map((t) => [t.channelId, t]));
	const firstComments = [...new Set(live.map((t) => t.firstComment ?? null))];
	const sharedFirstComment = firstComments.length === 1 ? firstComments[0] : null;

	const newCaption = fields.caption !== undefined;
	const newMedia = fields.mediaIds !== undefined;
	const newFirstComment = fields.firstComment !== undefined;
	const channelIds = fields.channelIds?.length
		? splitIds(fields.channelIds)
		: live.map((t) => t.channelId);

	const targets = channelIds.map((channelId) => {
		const target = byChannel.get(channelId);
		let firstComment: string | null;
		if (newFirstComment) firstComment = fields.firstComment || null;
		else firstComment = target ? target.firstComment : sharedFirstComment;
		if (!target) return { channelId, firstComment };
		return {
			channelId,
			contentType: newMedia ? undefined : target.contentType,
			caption: newCaption ? null : target.caption,
			mediaIds: newMedia ? [] : target.mediaIds,
			firstComment,
			settings: target.settings ?? {},
		};
	});

	const keepsSchedule = current.status !== 'draft' && current.scheduledAt;
	requestOptions.body = {
		title: fields.title !== undefined ? fields.title || null : current.title,
		caption: newCaption ? fields.caption : current.caption,
		mediaIds: newMedia ? splitIds(fields.mediaIds) : current.mediaIds,
		targets,
		...(keepsSchedule ? { mode: 'schedule', scheduledAt: current.scheduledAt } : { mode: 'draft' }),
	};
	return requestOptions;
}

export async function buildRescheduleBody(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	requestOptions.body = { scheduledAt: scheduledAt.call(this) };
	return requestOptions;
}

/** 'Scheduled After' and 'Scheduled Before', read in the timezone of the workflow. */
export async function addScheduleRange(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const filters = this.getNodeParameter('filters', {}) as { from?: string; to?: string };
	const timeZone = this.getTimezone();
	const qs: IDataObject = { ...(requestOptions.qs ?? {}) };
	const from = toInstant(filters.from, timeZone);
	const to = toInstant(filters.to, timeZone);
	if (from) qs.from = from;
	if (to) qs.to = to;
	requestOptions.qs = qs;
	return requestOptions;
}

export async function simplifyComments(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	if (!(this.getNodeParameter('simplify', true) as boolean)) return items;
	return items.map((item) => ({ ...item, json: simplifyComment(item.json) }));
}
