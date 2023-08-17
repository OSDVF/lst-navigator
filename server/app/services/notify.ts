/* eslint-disable no-console */
import { initializeApp } from 'firebase/app'
import { DocumentReference, collection, doc, getDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { GoogleAuth } from 'google-auth-library'
import * as Sentry from '@sentry/node'


export default async function () {
    const config = useRuntimeConfig()
    const eventDbName = config.public.dbCollectionName
    initializeApp(config.vuefire.options.config)
    const firestore = useFirestore()
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase.messaging']
    })
    const accessToken = await auth.getAccessToken()

    const col = collection(firestore, eventDbName)

    function getDocument(docName: string, ...pathSegments: string[]) {
        if (typeof eventDbName === 'undefined') {
            return null
        }
        return doc(col, docName, ...pathSegments)
    }

    const subscriptionsDocument = getDocument('subscriptions')
    if (subscriptionsDocument === null) {
        return
    }
    const subscriptions = await (await getDoc(subscriptionsDocument)).data()
    if (typeof subscriptions === 'undefined') {
        return
    }

    const scheduleDocument = getDocument('schedule')
    if (scheduleDocument === null) {
        return
    }
    const scheduleParts = await (await getDoc(scheduleDocument)).data()?.parts

    if (scheduleParts === null) {
        return
    }
    const now = new Date()
    const responses: { [key: string]: any } = {}
    const errors: { [key: string]: any } = {}
    const promises: Promise<void | Response>[] = []
    for (let partIndex = 0; partIndex < scheduleParts.length; partIndex++) {
        const part = scheduleParts[partIndex] as DocumentReference
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
                promises.push(fetch(`https://fcm.googleapis.com/v1/projects/${config.vuefire.options.config.projectId}/messages:send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + accessToken
                    },
                    body: JSON.stringify({
                        message: {
                            token: subscription,
                            notification: {
                                title: event.title,
                                body: event.subtitle ?? event.description
                            },
                            data: {
                                url: `/schedule/${partIndex}/${eventIndex}`
                            },
                            webpush: {
                                headers: {
                                    Urgency: 'high'
                                },
                                notification: {
                                    requireInteraction: 'true'
                                }
                            }
                        }
                    })
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
    return responses
}
