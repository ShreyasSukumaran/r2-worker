/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const hasValidHeader = (request, env) => {
	return request.headers.get('X-Custom-Auth-Key') === env.AUTH_KEY_SECRET;
};

function authorizeRequest(request, env, key) {
	switch (request.method) {
		case 'PUT':
		case 'DELETE':
			return hasValidHeader(request, env);
		case 'GET':
			return true;
		default:
			return false;
	}
}

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
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
					return new Response(`Uploaded ${filename} successfully!`);
				} catch (error) {
					return new Response('On upload error occurred.\n Error : '.error);
				}
			case 'GET':
				const object = await env.MY_BUCKET.get(key);

				if (object === null) {
					return new Response('Object Not Found', { status: 404 });
				}

				const headers = new Headers();
				object.writeHttpMetadata(headers);
				headers.set('etag', object.httpEtag);

				return new Response(object.body, {
					headers,
				});
			case 'DELETE':
				await env.MY_BUCKET.delete(key);
				return new Response('Deleted!');

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
