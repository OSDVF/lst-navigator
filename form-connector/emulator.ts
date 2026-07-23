import '@mcpher/gas-fakes/src/services/content/app.js'
import '@mcpher/gas-fakes/src/services/stores/app.js'
import * as api from './src/api'

const endpoint = Bun.env.REGISTRATION_FORM_API
if (!endpoint) {
    throw new Error('REGISTRATION_FORM_API environment variable is not set')
}
const parsed = URL.parse(endpoint)
if (!parsed) {
    throw new Error('REGISTRATION_FORM_API environment variable is not a valid URL')
}

Bun.serve({
    port: parsed.port || 4242,
    development: true,
    async fetch(req) {
        console.trace(req)
        const reqUrl = URL.parse(req.url)
        const query = reqUrl?.search.substring(1)
        const payload = {
            contentLength: parseInt(req.headers.get('content-length')!),
            contextPath: '',
            queryString: query ?? '',
            parameter: Object.fromEntries(new URLSearchParams(query).entries()),
            parameters: {},
            pathInfo: reqUrl?.pathname.substring(1) ?? '',
        }
        console.trace(payload)
        let output: void | GoogleAppsScript.Content.TextOutput
        switch (req.method) {
            case 'POST':
                const body = await req.body?.text() ?? ''
                output = api.doPost({
                    ...payload,
                    postData: {
                        contents: body,
                        length: body.length,
                        type: req.headers.get('content-type') ?? 'text/plain',
                        name: 'postData'
                    }
                })
                break
            case 'GET':
                output = api.doGet(payload)
                break
            default:
                return new Response('405 Metod Not Allowed', {status: 405})
        }
        if (output) {
            return new Response(output.getContent())
        }
        return new Response('500 No ouptut', { status: 500 })
    },
})
