import type { INodeProperties } from 'n8n-workflow';
import { getManyFields, mediaLocator } from '../shared/descriptions';

const showFor = (...operation: string[]) => ({ show: { resource: ['media'], operation } });

const data = { postReceive: [{ type: 'rootProperty' as const, properties: { property: 'data' } }] };

export const mediaDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['media'] } },
		options: [
			{
				name: 'Delete',
				value: 'delete',
				action: 'Delete a file from the media library',
				description:
					'Remove a file. A file still used by a scheduled post is kept until that post goes out.',
				routing: {
					request: { method: 'DELETE', url: '=/media/{{$parameter.mediaId}}' },
					output: data,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a file from the media library',
				description: 'Get the URL, type, size, and status of a file',
				routing: {
					request: { method: 'GET', url: '=/media/{{$parameter.mediaId}}' },
					output: data,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many files from the media library',
				description: 'List the files in the media library, newest first',
				routing: {
					request: { method: 'GET', url: '/media' },
					output: data,
				},
			},
			{
				name: 'Import From URL',
				value: 'import',
				action: 'Import a file from a URL into the media library',
				description: 'Copy an image or video from a public URL, ready to attach to a post',
				routing: {
					request: { method: 'POST', url: '/media/imports' },
					output: data,
				},
			},
		],
		default: 'import',
	},
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/image.png',
		description: 'Public link to an image or video. eksis downloads it and keeps a copy.',
		displayOptions: showFor('import'),
		routing: { send: { type: 'body', property: 'url' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: showFor('import'),
		options: [
			{
				displayName: 'File Name',
				name: 'filename',
				type: 'string',
				default: '',
				placeholder: 'e.g. autumn-collection.jpg',
				description: 'Name to show in the media library. Defaults to the file name in the URL.',
				routing: { send: { type: 'body', property: 'filename' } },
			},
		],
	},
	{
		...mediaLocator,
		displayOptions: showFor('delete', 'get'),
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: showFor('delete'),
		options: [
			{
				displayName: 'Delete Even if Used',
				name: 'force',
				type: 'boolean',
				default: false,
				description:
					'Whether to delete the file right away even when a post that has not gone out still uses it',
				routing: { send: { type: 'query', property: 'force', value: '={{ String($value) }}' } },
			},
		],
	},
	...getManyFields('media', true),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: showFor('getAll'),
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{ name: 'Image', value: 'image' },
					{ name: 'Video', value: 'video' },
				],
				default: 'image',
				routing: { send: { type: 'query', property: 'type' } },
			},
		],
	},
];
