import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute, Route } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { clientsClaim, skipWaiting } from 'workbox-core'
import * as firebase from 'firebase/app'
import { getMessaging, isSupported, MessagePayload, onBackgroundMessage } from 'firebase/messaging/sw'
import * as Sentry from '@sentry/browser'
import { SeverityLevel } from '@sentry/browser'
import { idb } from '@composi/idb/types'
import { NotificationPayload } from '@/utils/types'
import swConfig from '~/utils/swenv'


declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
// Precaching behaviour
precacheAndRoute(self.__WB_MANIFEST)

// Service worker lifecycle
skipWaiting()
clientsClaim()

const app = firebase.initializeApp(swConfig.firebase)
isSupported().then((supported) => {
    if (!supported) {
        return
    }
    const messagingInstance = getMessaging(app)
    onBackgroundMessage(messagingInstance, async (payload: MessagePayload) => {
        if (await idb.get('doNotifications') !== 'false') {
            console.log('[SW] Received message ', payload)
            const payloadData = payload.data as NotificationPayload | undefined

            const eventTime = new Date()
            if (payloadData) {
                const [year, month, day] = payloadData.date.split('-').map((x:string) => parseInt(x, 10))
                eventTime.setFullYear(year)
                eventTime.setMonth(month - 1)
                eventTime.setDate(day)
                eventTime.setMinutes(payloadData.time % 100)
                eventTime.setHours(Math.floor(payloadData.time / 100))
            }

            if (new Date().getTime() - eventTime.getTime() > 1000 * 60 * 10) { // 10 minutes timeout
                return// discard old messages
            }
            self.registration.showNotification(payload.notification?.title ?? swConfig.messaging.title ?? 'Notification',
                {
                    ...swConfig.messaging,
                    ...payload.notification
                })

            self.clients.matchAll({ type: 'window' }).then((clients) => {
                let foundMatchingClient = false
                for (let i = 0; i < clients.length; i++) {
                    const client = clients[i]
                    if (client.url === payloadData?.url) {
                        foundMatchingClient = true
                        return client.focus()
                    }
                }
                if (!foundMatchingClient && self.clients.openWindow) {
                    self.clients.openWindow(payloadData?.url ?? '/')
                }
            })
        } else {
            console.log('[SW] Not showing message ', payload)
        }
    })
})
addEventListener('message', (event: MessageEvent) => {
    if (event.data) {
        switch (event.data.type) {
        // Prompt For Update behaviour
        case 'SKIP_WAITING':
            self.skipWaiting()
            break
        case 'CLIENTS_CLAIM':
            self.clients.claim()
            break
        case 'INITIALIZE_SENTRY':
            Sentry.init(event.data.config)
            Sentry.setTag('commitHash', swConfig.commitHash)
            break
        }
    }
    Sentry.captureMessage('Message received', {
        level: 'debug' as SeverityLevel,
        extra: event.data
    })
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close()
    console.log('[SW] Notification click Received.', event.notification)
    Sentry.addBreadcrumb({
        category: 'notification',
        data: event.notification,
        timestamp: Date.now(),
        level: 'debug'
    })
})

self.addEventListener(
    'pushsubscriptionchange',
    (event: any) => {
        Sentry.captureMessage('Push subscription change', {
            level: 'debug',
            extra: event
        })
        const subscription = self.registration.pushManager
            .subscribe(event.oldSubscription.options)
            .then(subscription =>
                fetch('register', {
                    method: 'post',
                    headers: {
                        'Content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        endpoint: subscription.endpoint
                    })
                })
            )
        event.waitUntil(subscription)
    },
    false
)

//
// Runtime caching
//
// Icons
const iconsRoute = new Route(({ request, sameOrigin }) => {
    return request.url.startsWith('https://api.iconify.design/')
}, new StaleWhileRevalidate())

registerRoute(iconsRoute)
