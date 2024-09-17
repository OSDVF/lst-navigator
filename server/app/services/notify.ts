 
import type { DocumentReference} from 'firebase/firestore'
import { doc, getDoc, terminate } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { GoogleAuth } from 'google-auth-library'
import * as Sentry from '@sentry/node'
import { initializeApp } from 'firebase/app'
import type { EventDescription } from '@/types/cloud'
import type { KnownCollectionName } from '@/utils/db'


export default async function () {
    const config = useRuntimeConfig()
    initializeApp((config.vuefire as any).options.config)
    const selectedEvent = config.public.defaultEvent
    const firestore = useFirestore()// firebase should be created in plugins/1.firebase.ts
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase.messaging'],
    })
    const accessToken = await auth.getAccessToken()

    async function eventDocument(event: string) {
        return (await getDoc(doc(firestore, `${'events' as KnownCollectionName}/${event}`))).data() as {[key in keyof EventDescription]: DocumentReference}
    }

    async function currentEventDocument(docName: keyof EventDescription, ...pathSegments: string[]) {
        const eDoc = await eventDocument(selectedEvent)
        return doc(eDoc[docName], '/', ...pathSegments)
    }

    const subscriptionsDocument = await currentEventDocument('subscriptions')
    if (subscriptionsDocument === null) {
        return
    }
    const subscriptions = await (await getDoc(subscriptionsDocument)).data()
    if (typeof subscriptions === 'undefined') {
        return
    }

    const days = (await (await getDoc(await currentEventDocument('schedule'))).data() as DocumentReference[])

    if (days === null) {
        return
    }
    const now = new Date()
    const responses: { [key: string]: any } = {}
    const errors: { [key: string]: any } = {}

    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    const promises: Promise<void | Response>[] = []
    for (let partIndex = 0; partIndex < days.length; partIndex++) {
        const part = days[partIndex]
        const partData = await (await getDoc(part)).data()
        if (typeof partData === 'undefined') {
            continue
        }
        const [year, month, day] = partData.date.split('-').map((x:string) => parseInt(x, 10))
        const date = new Date(year, month - 1, day)
        // check for today
        if (date.getDate() !== now.getDate() || date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) {
            continue
        }
        for (let eventIndex = 0; eventIndex < partData.program.length; eventIndex++) {
            const event = partData.program[eventIndex]
            const eventTime = new Date()
            eventTime.setHours(Math.floor(event.time / 100))
            eventTime.setMinutes(event.time % 100)
            // reminders 10 minutes before
            const diff = eventTime.getTime() - now.getTime()
            if (diff < 0 || diff > 10 * 60 * 1000) {
                continue
            }

            for (const subscription of subscriptions.tokens) {
                // send notification
                console.log(`[${new Date().toISOString()}] Sending notification about ${event.title} to ${subscription}`)
                promises.push(fetch(`https://fcm.googleapis.com/v1/projects/${(config.vuefire as any).options.config.projectId}/messages:send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + accessToken,
                    },
                    body: JSON.stringify({
                        message: {
                            token: subscription,
                            notification: {
                                title: event.title,
                                body: event.subtitle ?? event.description,
                            },
                            data: {
                                url: `/schedule/${partIndex}/${eventIndex}`,
                            },
                            webpush: {
                                headers: {
                                    Urgency: 'high',
                                },
                                notification: {
                                    requireInteraction: 'true',
                                },
                            },
                        },
                    }),
                }).then(async (response) => {
                    const body = await response.text()
                    if (response.ok) {
                        responses[subscription as string] = body
                    } else {
                        errors[subscription as string] = body
                    }
                    return response
                }).catch((e) => {
                    console.error(e)
                    Sentry.captureException(e)
                }))
            }
        }
    }
    await Promise.all(promises)
    console.log(new Date(), responses)
    console.error(errors)
    terminate(firestore)
    return responses
}
