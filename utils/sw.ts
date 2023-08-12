import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute, Route } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import * as firebase from 'firebase/app'
import { getMessaging, isSupported, MessagePayload, onBackgroundMessage } from 'firebase/messaging/sw'
import * as Sentry from '@sentry/browser'
import { SeverityLevel } from '@sentry/browser'
import swConfig from '~/utils/swenv'

declare let self: ServiceWorkerGlobalScope

// Precaching behaviour
precacheAndRoute(self.__WB_MANIFEST)

const app = firebase.initializeApp(swConfig.firebase)
isSupported().then((supported) => {
    if (!supported) {
        return
    }
    const messagingInstance = getMessaging(app)
    onBackgroundMessage(messagingInstance, (payload: MessagePayload) => {
        console.log('[SW] Received message ', payload)

        self.registration.showNotification(payload.notification?.title ?? swConfig.messaging.title ?? 'Notification',
            {
                ...swConfig.messaging,
                ...payload.notification
            })
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
