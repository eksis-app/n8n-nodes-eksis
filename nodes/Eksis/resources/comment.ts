import type { INodeProperties } from 'n8n-workflow';
import { commentLocator, getManyFields } from '../shared/descriptions';
import { simplifyComments } from '../shared/hooks';

const showFor = (...operation: string[]) => ({ show: { resource: ['comment'], operation } });

const rootData = { type: 'rootProperty' as const, properties: { property: 'data' } };
const data = { postReceive: [rootData] };
const simplified = { postReceive: [rootData, simplifyComments] };

export const commentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['comment'] } },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a comment',
				description: 'Delete a comment on the platform, where the platform allows it',
				routing: {
					request: { method: 'DELETE', url: '=/comments/{{$parameter.commentId}}' },
					output: {
						postReceive: [{ type: 'set', properties: { value: '={{ { "deleted": true } }}' } }],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a comment',
				description: 'Get a comment with the post it belongs to and the replies around it',
				routing: {
					request: { method: 'GET', url: '=/comments/{{$parameter.commentId}}' },
					output: simplified,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many comments',
				description: 'List comments on connected channels, newest first',
				routing: {
					request: { method: 'GET', url: '/comments' },
					output: simplified,
				},
			},
			{
				name: 'Hide',
				value: 'hide',
				action: 'Hide a comment',
				description: 'Hide a comment from everyone except its author, where the platform allows it',
				routing: {
					request: { method: 'POST', url: '=/comments/{{$parameter.commentId}}/hide' },
					output: data,
				},
			},
			{
				name: 'Reply',
				value: 'reply',
				action: 'Reply to a comment',
				description: 'Post a public reply from the channel',
				routing: {
					request: { method: 'POST', url: '=/comments/{{$parameter.commentId}}/reply' },
					output: data,
				},
			},
			{
				name: 'Unhide',
				value: 'unhide',
				action: 'Unhide a comment',
				description: 'Show a hidden comment again',
				routing: {
					request: { method: 'POST', url: '=/comments/{{$parameter.commentId}}/unhide' },
					output: data,
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a comment',
				description: 'Mark a comment as done or open it again in the eksis inbox',
				routing: {
					request: { method: 'PATCH', url: '=/comments/{{$parameter.commentId}}' },
					output: data,
				},
			},
		],
		default: 'reply',
	},
	{
		...commentLocator,
		displayOptions: showFor('delete', 'get', 'hide', 'reply', 'unhide', 'update'),
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		placeholder: 'e.g. Thank you! We sent the details by DM.',
		description: 'The reply, up to 2,200 characters',
		displayOptions: showFor('reply'),
		routing: { send: { type: 'body', property: 'text' } },
	},
	{
		displayName: 'Status',
		name: 'status',
		type: 'options',
		options: [
			{ name: 'Done', value: 'done', description: 'Move the comment out of the open list' },
			{ name: 'Open', value: 'open', description: 'Put the comment back in the open list' },
		],
		default: 'done',
		description: 'Status of the comment in the eksis inbox',
		displayOptions: showFor('update'),
		routing: { send: { type: 'body', property: 'status' } },
	},
	...getManyFields('comment', true),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showFor('getAll'),
		options: [
			{
				displayName: 'Channel Names or IDs',
				name: 'channels',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: [],
				hint: 'Keeps comments on any of these channels',
				routing: {
					send: { type: 'query', property: 'channels', value: '={{ $value.join(",") }}' },
				},
			},
			{
				displayName: 'Post ID',
				name: 'postId',
				type: 'string',
				default: '',
				description: 'Keep comments on this eksis post',
				routing: { send: { type: 'query', property: 'postId' } },
			},
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				placeholder: 'e.g. price',
				description: 'Text found in the comment, ignoring case',
				routing: { send: { type: 'query', property: 'q' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'Assigned', value: 'assigned' },
					{ name: 'Done', value: 'done' },
					{ name: 'Open', value: 'open' },
				],
				default: 'open',
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		displayOptions: showFor('get', 'getAll'),
	},
];
