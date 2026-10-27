import type { INodeProperties } from 'n8n-workflow';
import { channelLocator, getManyFields } from '../shared/descriptions';

const data = { postReceive: [{ type: 'rootProperty' as const, properties: { property: 'data' } }] };

export const channelDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['channel'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a channel',
				description: 'Get a connected channel with its connection status and publishing rules',
				routing: {
					request: { method: 'GET', url: '=/channels/{{$parameter.channelId}}' },
					output: data,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many channels',
				description: 'List the channels connected to the workspace',
				routing: {
					request: { method: 'GET', url: '/channels' },
					output: data,
				},
			},
		],
		default: 'getAll',
	},
	{
		...channelLocator,
		displayOptions: { show: { resource: ['channel'], operation: ['get'] } },
	},
	...getManyFields('channel', false),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['channel'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Include Disconnected',
				name: 'includeDisconnected',
				type: 'boolean',
				default: false,
				description: 'Whether to include channels that were disconnected from the workspace',
				routing: {
					send: { type: 'query', property: 'includeDisconnected', value: '={{ String($value) }}' },
				},
			},
		],
	},
];
