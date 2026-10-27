import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EksisApi implements ICredentialType {
	name = 'eksisApi';

	displayName = 'Eksis API';

	icon: Icon = { light: 'file:../icons/eksis.svg', dark: 'file:../icons/eksis.svg' };

	documentationUrl = 'https://docs.eksis.io/en/api/authenticating';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			description:
				'A key from Settings > API in your eksis workspace. It starts with eksis_sk_. The trigger node needs a key with the Admin role.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.eksis.io',
			url: '/v1/me',
			method: 'GET',
		},
	};
}
