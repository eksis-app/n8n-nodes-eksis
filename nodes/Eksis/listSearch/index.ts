import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchResult,
	INodePropertyOptions,
} from 'n8n-workflow';
import { eksisApiRequest } from '../shared/transport';
import { clip, platformLabel } from '../shared/utils';

type Page = { data: IDataObject[]; nextCursor?: string | null };

const PAGE_SIZE = 50;

async function fetchPage(
	this: ILoadOptionsFunctions,
	path: string,
	qs?: IDataObject,
): Promise<Page> {
	return (await eksisApiRequest.call(this, 'GET', path, undefined, qs)) as unknown as Page;
}

function pageQuery(filter?: string, paginationToken?: string, searchable = true): IDataObject {
	const qs: IDataObject = { limit: PAGE_SIZE };
	if (filter && searchable) qs.q = filter;
	if (paginationToken) qs.cursor = paginationToken;
	return qs;
}

function matches(filter: string | undefined, ...values: unknown[]): boolean {
	if (!filter) return true;
	const needle = filter.toLowerCase();
	return values.some((v) =>
		String(v ?? '')
			.toLowerCase()
			.includes(needle),
	);
}

/** Some platforms already store the username with its `@`. */
function handle(username: unknown): string {
	return `@${String(username ?? '').replace(/^@/, '')}`;
}

function channelName(channel: IDataObject): string {
	return `${channel.displayName || channel.username} (${platformLabel(channel.platform)})`;
}

export async function searchChannels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const { data } = await fetchPage.call(this, '/channels');
	return {
		results: data
			.filter((c) => matches(filter, c.displayName, c.username, c.platform))
			.map((c) => ({ name: channelName(c), value: String(c.id) })),
	};
}

export async function searchPosts(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { data, nextCursor } = await fetchPage.call(
		this,
		'/posts',
		pageQuery(filter, paginationToken),
	);
	return {
		results: data.map((p) => ({
			name: `${clip(p.title || p.caption || 'Untitled post')} (${p.status})`,
			value: String(p.id),
		})),
		paginationToken: nextCursor ?? undefined,
	};
}

export async function searchMedia(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	// The media list has no text search, so the filter is applied to each page.
	const { data, nextCursor } = await fetchPage.call(
		this,
		'/media',
		pageQuery(filter, paginationToken, false),
	);
	return {
		results: data
			.filter((m) => matches(filter, m.filename))
			.map((m) => ({ name: `${m.filename} (${m.kind})`, value: String(m.id), url: String(m.url) })),
		paginationToken: nextCursor ?? undefined,
	};
}

export async function searchComments(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { data, nextCursor } = await fetchPage.call(
		this,
		'/comments',
		pageQuery(filter, paginationToken),
	);
	return {
		results: data.map((c) => ({
			name: `${c.authorUsername ? `${handle(c.authorUsername)}: ` : ''}${clip(c.text)}`,
			value: String(c.id),
		})),
		paginationToken: nextCursor ?? undefined,
	};
}

export async function getChannels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { data } = await fetchPage.call(this, '/channels');
	return data
		.map((c) => ({ name: channelName(c), value: String(c.id), description: handle(c.username) }))
		.sort((a, b) => a.name.localeCompare(b.name));
}
