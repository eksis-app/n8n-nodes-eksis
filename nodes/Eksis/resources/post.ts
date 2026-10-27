import type { INodeProperties } from 'n8n-workflow';
import { getManyFields, postLocator } from '../shared/descriptions';
import {
	addScheduleRange,
	buildCreatePostBody,
	buildRescheduleBody,
	buildUpdatePostBody,
} from '../shared/hooks';

const showFor = (...operation: string[]) => ({ show: { resource: ['post'], operation } });

const data = { postReceive: [{ type: 'rootProperty' as const, properties: { property: 'data' } }] };

const firstCommentField: INodeProperties = {
	displayName: 'First Comment',
	name: 'firstComment',
	type: 'string',
	typeOptions: { rows: 2 },
	default: '',
	description:
		'Posted as a comment right after the post goes out. Channels whose platform has no first comment refuse it.',
};

const mediaIdsField: INodeProperties = {
	displayName: 'Media IDs',
	name: 'mediaIds',
	type: 'string',
	default: '',
	placeholder: 'e.g. 1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e, 6f7a8b9c-...',
	description:
		"Comma-separated IDs of files in your eksis media library. Use the 'Import From URL' operation of the Media resource to add a file first.",
};

const titleField: INodeProperties = {
	displayName: 'Title',
	name: 'title',
	type: 'string',
	default: '',
	description: 'Internal label shown in eksis. It is never published.',
};

export const postDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['post'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a post',
				description: 'Save a post as a draft, schedule it, add it to the queue, or publish it now',
				routing: {
					request: { method: 'POST', url: '/posts' },
					send: { preSend: [buildCreatePostBody] },
					output: data,
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a post',
				description: 'Delete a post that has not gone out yet',
				routing: {
					request: { method: 'DELETE', url: '=/posts/{{$parameter.postId}}' },
					output: {
						postReceive: [{ type: 'set', properties: { value: '={{ { "deleted": true } }}' } }],
					},
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a post',
				description: 'Get a post with the status of each channel it goes to',
				routing: {
					request: { method: 'GET', url: '=/posts/{{$parameter.postId}}' },
					output: data,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many posts',
				description: 'List posts, newest first',
				routing: {
					request: { method: 'GET', url: '/posts' },
					send: { preSend: [addScheduleRange] },
					output: data,
				},
			},
			{
				name: 'Publish',
				value: 'publish',
				action: 'Publish a post now',
				description: 'Send a draft, scheduled, or failed post out right away',
				routing: {
					request: { method: 'POST', url: '=/posts/{{$parameter.postId}}/publish' },
					output: data,
				},
			},
			{
				name: 'Reschedule',
				value: 'reschedule',
				action: 'Reschedule a post',
				description: 'Move a post to another time',
				routing: {
					request: { method: 'POST', url: '=/posts/{{$parameter.postId}}/reschedule' },
					send: { preSend: [buildRescheduleBody] },
					output: data,
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a post',
				description: 'Change the caption, channels, media, first comment, or title of a post',
				routing: {
					request: { method: 'PATCH', url: '=/posts/{{$parameter.postId}}' },
					send: { preSend: [buildUpdatePostBody] },
					output: data,
				},
			},
		],
		default: 'create',
	},

	// Create
	{
		displayName: 'Channel Names or IDs',
		name: 'channelIds',
		type: 'multiOptions',
		description:
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		typeOptions: { loadOptionsMethod: 'getChannels' },
		required: true,
		default: [],
		hint: 'Channels to publish to',
		displayOptions: showFor('create'),
	},
	{
		displayName: 'Caption',
		name: 'caption',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		placeholder: 'e.g. New colours are in. Which one is yours?',
		description:
			'Text of the post. Leave it empty for a media-only post where the platform allows one.',
		displayOptions: showFor('create'),
	},
	{
		displayName: 'Timing',
		name: 'mode',
		type: 'options',
		options: [
			{
				name: 'Add to Queue',
				value: 'queue',
				description: 'Take the next free slot in the queue of each channel',
			},
			{
				name: 'Publish Now',
				value: 'now',
				description: 'Send the post out right away',
			},
			{
				name: 'Save as Draft',
				value: 'draft',
				description: 'Keep the post in eksis without publishing it',
			},
			{
				name: 'Schedule',
				value: 'schedule',
				description: 'Publish at the time set below',
			},
		],
		default: 'draft',
		description: 'When the post goes out',
		displayOptions: showFor('create'),
	},
	{
		displayName: 'Scheduled Time',
		name: 'scheduledAt',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'A time without an offset is read in the timezone of this workflow',
		displayOptions: { show: { resource: ['post'], operation: ['create'], mode: ['schedule'] } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor('create'),
		options: [firstCommentField, mediaIdsField, titleField],
	},

	// Get, Delete, Publish, Reschedule, Update
	{
		...postLocator,
		displayOptions: showFor('delete', 'get', 'publish', 'reschedule', 'update'),
	},
	{
		displayName: 'Scheduled Time',
		name: 'scheduledAt',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'The new time. A time without an offset is read in the timezone of this workflow.',
		displayOptions: showFor('reschedule'),
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor('update'),
		options: [
			{
				displayName: 'Caption',
				name: 'caption',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
				description:
					'New text for every channel. Captions written for a single channel are replaced.',
			},
			{
				displayName: 'Channel Names or IDs',
				name: 'channelIds',
				type: 'multiOptions',
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: { loadOptionsMethod: 'getChannels' },
				default: [],
				hint: 'The full list of channels the post goes to. Channels left out are removed from the post.',
			},
			firstCommentField,
			{
				...mediaIdsField,
				description:
					'Comma-separated IDs of files in your eksis media library. They replace the media of every channel.',
			},
			titleField,
		],
	},

	// Get Many
	...getManyFields('post', true),
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
				hint: 'Keeps posts that go to any of these channels',
				routing: {
					send: { type: 'query', property: 'channels', value: '={{ $value.join(",") }}' },
				},
			},
			{
				displayName: 'Scheduled After',
				name: 'from',
				type: 'dateTime',
				default: '',
				description:
					'Keep posts scheduled at or after this time. Posts without a time are left out.',
			},
			{
				displayName: 'Scheduled Before',
				name: 'to',
				type: 'dateTime',
				default: '',
				description:
					'Keep posts scheduled at or before this time. Posts without a time are left out.',
			},
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				placeholder: 'e.g. launch',
				description: 'Text found in the title or the caption, ignoring case',
				routing: { send: { type: 'query', property: 'q' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Draft', value: 'draft' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Partially Published', value: 'partially_published' },
					{ name: 'Pending Approval', value: 'pending_approval' },
					{ name: 'Published', value: 'published' },
					{ name: 'Publishing', value: 'publishing' },
					{ name: 'Scheduled', value: 'scheduled' },
				],
				default: 'scheduled',
				routing: { send: { type: 'query', property: 'status' } },
			},
		],
	},
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'collection',
		placeholder: 'Add Sort Rule',
		default: {},
		displayOptions: showFor('getAll'),
		options: [
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				options: [
					{ name: 'Newest First', value: 'newest' },
					{ name: 'Oldest First', value: 'oldest' },
				],
				default: 'newest',
				description: 'Order by the time the post was created',
				routing: { send: { type: 'query', property: 'sort' } },
			},
		],
	},
];
