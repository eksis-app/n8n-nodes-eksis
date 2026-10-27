import type { INodeProperties } from 'n8n-workflow';

function locator(
	displayName: string,
	name: string,
	searchListMethod: string,
	idPlaceholder: string,
	searchable = true,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: `Select a ${displayName.toLowerCase()}...`,
				typeOptions: {
					searchListMethod,
					searchable,
				},
			},
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				placeholder: idPlaceholder,
			},
		],
	};
}

export const channelLocator = locator(
	'Channel',
	'channelId',
	'searchChannels',
	'e.g. 3f1c2a9e-7b4d-4c1a-9e2f-8d6b5a4c3b21',
);

export const postLocator = locator(
	'Post',
	'postId',
	'searchPosts',
	'e.g. 9a8b7c6d-5e4f-4a3b-2c1d-0e9f8a7b6c5d',
);

export const mediaLocator = locator(
	'Media',
	'mediaId',
	'searchMedia',
	'e.g. 1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
);

export const commentLocator = locator(
	'Comment',
	'commentId',
	'searchComments',
	'e.g. 7e6d5c4b-3a2f-4e1d-0c9b-8a7f6e5d4c3b',
);

/**
 * Return All and Limit for a Get Many operation. `paged` is for endpoints that
 * answer with `data` plus a `nextCursor`; the others return every row at once
 * and only need the limit applied to the output.
 */
export function getManyFields(resource: string, paged: boolean): INodeProperties[] {
	const show = { resource: [resource], operation: ['getAll'] };
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show },
			routing: paged
				? {
						send: {
							paginate: '={{ $value }}',
							type: 'query',
							property: 'limit',
							value: '100',
						},
						operations: {
							pagination: {
								type: 'generic',
								properties: {
									continue: '={{ !!$response.body.nextCursor }}',
									request: {
										qs: {
											cursor: '={{ $response.body.nextCursor }}',
										},
									},
								},
							},
						},
					}
				: undefined,
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: {
				minValue: 1,
				maxValue: 100,
			},
			default: 50,
			description: 'Max number of results to return',
			displayOptions: { show: { ...show, returnAll: [false] } },
			routing: {
				send: paged ? { type: 'query', property: 'limit' } : undefined,
				output: {
					maxResults: '={{ $value }}',
				},
			},
		},
	];
}
