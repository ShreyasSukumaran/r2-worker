const hasValidHeader = (request, env) => {
	return request.headers.get('X-Custom-Auth-Key') === env.AUTH_KEY_SECRET;
};

const allowedUrls = ['http://localhost:5173', 'https://mw-store.site', 'https://mw-store.netlify.app'];

function authorizeRequest(request, env, key) {
	switch (request.method) {
		case 'PUT':
		case 'DELETE':
			return hasValidHeader(request, env);
		case 'OPTIONS':
		case 'GET':
			return allowedUrls.includes(request.headers.get('origin'));
		default:
			return false;
	}
}

function addCorsHeaders(headers) {
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'PUT, GET, DELETE, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Custom-Auth-Key, filename');
	headers.set('Access-Control-Max-Age', '86400');
	return headers;
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const headers = new Headers();
		const key = url.pathname.slice(1);
		if (!authorizeRequest(request, env, key)) {
			return new Response('Forbidden', { status: 403 });
		}
		switch (request.method) {
			case 'PUT':
				try {
					const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
					const filename = request.headers.get('filename');
					await env.MY_BUCKET.put(filename, request.body, {
						httpMetadata: {
							contentType: contentType,
						},
					});

					addCorsHeaders(headers);

					return new Response(JSON.stringify({ status: 200, message: `Uploaded ${filename} successfully!` }), { status: 200, headers });
				} catch (error) {
					return new Response('On upload error occurred.\n Error : '.error);
				}
			case 'GET':
				const object = await env.MY_BUCKET.get(key);

				if (object === null) {
					return new Response('Object Not Found', { status: 404 });
				}

				object.writeHttpMetadata(headers);
				addCorsHeaders(headers);
				headers.set('etag', object.httpEtag);

				return new Response(object.body, {
					headers,
				});
			case 'DELETE':
				await env.MY_BUCKET.delete(key);
				addCorsHeaders(headers);
				return new Response('Deleted!');
			case 'OPTIONS':
				addCorsHeaders(headers);
				return new Response(null, { status: 204, headers });
			default:
				return new Response('Method Not Allowed', {
					status: 405,
					headers: {
						Allow: 'PUT, GET, DELETE',
					},
				});
		}
	},
};
