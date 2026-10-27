import { createHmac, timingSafeEqual } from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import { eksisApiRequest } from '../Eksis/shared/transport';

/** Deliveries older than this are refused, so a captured request cannot be replayed later. */
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

const SECRET_PREFIX = 'whsec_';

type WebhookStaticData = { webhookId?: string; webhookSecret?: string };

type WebhookEndpoint = {
	id: string;
	url: string;
	status: string;
	events: string[];
	secret?: string;
};

function isNotFound(error: unknown): boolean {
	return String((error as { httpCode?: string }).httpCode) === '404';
}

function sameEvents(a: string[], b: string[]): boolean {
	return a.length === b.length && a.every((event) => b.includes(event));
}

/**
 * eksis signs `id.timestamp.body` with HMAC-SHA256 (Standard Webhooks). During
 * a secret rotation the header carries one `v1,<base64>` per secret, so a match
 * with any of them is enough.
 */
function signatureMatches(
	secret: string,
	headers: Record<string, string | string[] | undefined>,
	body: Buffer,
): boolean {
	const header = (name: string) => {
		const value = headers[name];
		return Array.isArray(value) ? value[0] : value;
	};
	const id = header('webhook-id');
	const timestamp = header('webhook-timestamp');
	const signature = header('webhook-signature');
	if (!id || !timestamp || !signature) return false;

	const sentAt = Number(timestamp);
	if (
		!Number.isFinite(sentAt) ||
		Math.abs(Date.now() / 1000 - sentAt) > SIGNATURE_TOLERANCE_SECONDS
	) {
		return false;
	}

	const key = Buffer.from(
		secret.startsWith(SECRET_PREFIX) ? secret.slice(SECRET_PREFIX.length) : secret,
		'base64',
	);
	const expected = createHmac('sha256', key).update(`${id}.${timestamp}.`).update(body).digest();

	return signature.split(' ').some((part) => {
		const [version, value] = part.split(',');
		if (version !== 'v1' || !value) return false;
		const given = Buffer.from(value, 'base64');
		return given.length === expected.length && timingSafeEqual(given, expected);
	});
}

export class EksisTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Eksis Trigger',
		name: 'eksisTrigger',
		icon: { light: 'file:../../icons/eksis.svg', dark: 'file:../../icons/eksis.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description:
			'Starts the workflow when a post goes out, a comment or message arrives, or a channel needs attention',
		defaults: {
			name: 'Eksis Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'eksisApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Needs an API key with the Admin role, on an eksis plan that includes webhooks. Each active workflow with this trigger takes one webhook endpoint in eksis, and n8n must be reachable over HTTPS.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The events that start the workflow',
				options: [
					{
						name: 'Channel Disconnected',
						value: 'channel.disconnected',
						description: 'A channel was disconnected from the workspace',
					},
					{
						name: 'Channel Lost Connection',
						value: 'channel.unhealthy',
						description: 'A channel lost its connection and holds the posts scheduled to it',
					},
					{
						name: 'Comment Received',
						value: 'comment.received',
						description: 'Someone else commented on a connected channel',
					},
					{
						name: 'Message Received',
						value: 'message.received',
						description: 'A direct message or a story reply arrived',
					},
					{
						name: 'Post Failed on a Channel',
						value: 'post.target.failed',
						description: 'A post could not go out on one of its channels, after every retry',
					},
					{
						name: 'Post Published on a Channel',
						value: 'post.target.published',
						description: 'A post went out on one of its channels',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as WebhookStaticData;
				if (!staticData.webhookId) return false;

				try {
					const { data } = (await eksisApiRequest.call(
						this,
						'GET',
						`/webhooks/${encodeURIComponent(staticData.webhookId)}`,
					)) as unknown as { data: WebhookEndpoint };
					const events = this.getNodeParameter('events') as string[];
					const current =
						data.url === this.getNodeWebhookUrl('default') &&
						data.status === 'active' &&
						sameEvents(data.events, events) &&
						Boolean(staticData.webhookSecret);
					if (current) return true;

					// The endpoint no longer matches this node, so it is replaced.
					await eksisApiRequest.call(this, 'DELETE', `/webhooks/${encodeURIComponent(data.id)}`);
				} catch (error) {
					if (!isNotFound(error)) throw new NodeApiError(this.getNode(), error as JsonObject);
				}

				delete staticData.webhookId;
				delete staticData.webhookSecret;
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as WebhookStaticData;
				const workflowName = this.getWorkflow().name ?? 'workflow';
				const body: IDataObject = {
					url: this.getNodeWebhookUrl('default'),
					events: this.getNodeParameter('events') as string[],
					description: `n8n: ${workflowName}`.slice(0, 120),
				};

				const { data } = (await eksisApiRequest.call(
					this,
					'POST',
					'/webhooks',
					body,
				)) as unknown as {
					data: WebhookEndpoint;
				};
				staticData.webhookId = data.id;
				staticData.webhookSecret = data.secret;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as WebhookStaticData;
				if (staticData.webhookId) {
					try {
						await eksisApiRequest.call(
							this,
							'DELETE',
							`/webhooks/${encodeURIComponent(staticData.webhookId)}`,
						);
					} catch (error) {
						if (!isNotFound(error)) return false;
					}
				}
				delete staticData.webhookId;
				delete staticData.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const { webhookSecret } = this.getWorkflowStaticData('node') as WebhookStaticData;

		if (!req.rawBody && typeof req.readRawBody === 'function') await req.readRawBody();
		const body = req.rawBody ?? Buffer.from(JSON.stringify(req.body));

		if (!webhookSecret || !signatureMatches(webhookSecret, req.headers, body)) {
			const res = this.getResponseObject();
			res.status(401).json({ message: 'The webhook signature does not match this workflow.' });
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)],
		};
	}
}
