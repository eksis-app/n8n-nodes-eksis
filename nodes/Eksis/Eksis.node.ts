import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import {
	getChannels,
	searchChannels,
	searchComments,
	searchMedia,
	searchPosts,
} from './listSearch';
import { channelDescription } from './resources/channel';
import { commentDescription } from './resources/comment';
import { mediaDescription } from './resources/media';
import { postDescription } from './resources/post';
import { EKSIS_API_URL } from './shared/transport';

export class Eksis implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Eksis',
		name: 'eksis',
		icon: { light: 'file:../../icons/eksis.svg', dark: 'file:../../icons/eksis.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Schedule and publish social posts, manage media, and answer comments with eksis',
		defaults: {
			name: 'Eksis',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'eksisApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: EKSIS_API_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Comment',
						value: 'comment',
					},
					{
						name: 'Media',
						value: 'media',
					},
					{
						name: 'Post',
						value: 'post',
					},
				],
				default: 'post',
			},
			...channelDescription,
			...commentDescription,
			...mediaDescription,
			...postDescription,
		],
	};

	methods = {
		loadOptions: {
			getChannels,
		},
		listSearch: {
			searchChannels,
			searchComments,
			searchMedia,
			searchPosts,
		},
	};
}
