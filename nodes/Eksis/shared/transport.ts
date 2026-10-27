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

type ApiErrorBody = { error?: { message?: unknown; hint?: unknown } };

type ErrorLike = {
	context?: { data?: unknown };
	response?: { data?: unknown; body?: unknown };
	cause?: { response?: { data?: unknown } };
};

/**
 * eksis answers a refused request with `{ error: { code, message, hint } }`.
 * Depending on the n8n version the body sits on the raw HTTP error or on the
 * NodeApiError that n8n already wrapped it in, so every place is checked.
 */
function eksisErrorOf(error: unknown): { message: string; hint?: string } | undefined {
	const e = (error ?? {}) as ErrorLike;
	for (const candidate of [
		e.context?.data,
		e.response?.data,
		e.response?.body,
		e.cause?.response?.data,
	]) {
		const apiError = (candidate as ApiErrorBody | undefined)?.error;
		if (apiError && typeof apiError.message === 'string') {
			return {
				message: apiError.message,
				hint: typeof apiError.hint === 'string' ? apiError.hint : undefined,
			};
		}
	}
	return undefined;
}

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
		const apiError = eksisErrorOf(error);
		throw new NodeApiError(
			this.getNode(),
			error as JsonObject,
			apiError ? { message: apiError.message, description: apiError.hint } : {},
		);
	}
}
