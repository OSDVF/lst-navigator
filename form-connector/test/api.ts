import type { ApplicationFormSecrets } from '../settings'

export async function main() {
    if (!process.env.APPLICATION_API) {
        console.log('Set APPLICATION_API env')
        return
    }

    return await fetch(process.env.APPLICATION_API, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            apiKey: process.env.VITE_APP_APIKEY,
            projectId: process.env.VITE_APP_PROJECTID,
            appId: process.env.VITE_APP_APPID,
            remoteEventSettings: '/applications/2026-v',

        } as ApplicationFormSecrets),
    })
}

console.log(await main())