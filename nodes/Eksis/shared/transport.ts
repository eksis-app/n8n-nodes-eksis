import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const EKSIS_API_URL = 'https://api.eksis.io/v1';

type EksisContext =
	| IExecuteSingleFunctions
	| IHookFunctions
	| ILoadOptionsFunctions
	| IWebhookFunctions;

/** Calls the eksis REST API with the eksisApi credential and returns the parsed body. */
export async function eksisApiRequest<T = IDataObject>(
	this: EksisContext,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<T> {
	const options: IHttpRequestOptions = {
		method,
		url: `${EKSIS_API_URL}${path}`,
		qs,
		body,
		json: true,
	};

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(this, 'eksisApi', options)) as T;
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject);
	}
}
