import { cleanupOutdatedCaches, PrecacheController, PrecacheRoute, createHandlerBoundToURL, getCacheKeyForURL } from 'workbox-precaching'
import { registerRoute, Route, NavigationRoute, Router } from 'workbox-routing'
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies'
import { clientsClaim } from 'workbox-core'
import * as firebase from 'firebase/app'
import { getMessaging, isSupported, type MessagePayload, onBackgroundMessage } from 'firebase/messaging/sw'
import * as Sentry from '@sentry/browser'
import * as idb from 'idb-keyval'
import type { NotificationPayload } from '@/utils/types'
import swConfig from '~/utils/swenv'

declare let self: ServiceWorkerGlobalScope
try {
    Sentry.init(swConfig.sentry)
    Sentry.setTag('commitHash', swConfig.commitHash)
} catch (e) {
    console.error('Sentry init failed', e)
}

cleanupOutdatedCaches()
const router = new Router()

// Precaching behaviour
const precacheController = new PrecacheController()
precacheController.addToCacheList(self.__WB_MANIFEST)
router.registerRoute(new PrecacheRoute(precacheController, {
    // Ignore all URL parameters.
    ignoreURLParametersMatching: [/.*/],
}))

function registerHome() {
    router.registerRoute(new NavigationRoute(createHandlerBoundToURL('/'), {
        denylist: [
            /\/__\/.*/, //  ignore firebase auth routes,
            /\/api\/.*/, // ignore server side api routes
        ],
    }))
    console.log('Registered catch-all route')
}
if (getCacheKeyForURL('/')) {
    registerHome()
}

const comChannel = new BroadcastChannel('SWCom')
self.addEventListener('fetch', async (event) => {
    const { request } = event
    const responsePromise = router.handleRequest({
        event,
        request,
    }) ?? fetch(request)
    event.respondWith(responsePromise)
    const resp = await responsePromise

    comChannel.postMessage(resp.status)
})

// Service worker lifecycle
self.skipWaiting()
clientsClaim()

comChannel.addEventListener('message', (ev) => {
    if (ev.data === 'install') {
        onUpdate()
    }
})
self.addEventListener('install', async event => {
    comChannel.postMessage('install')
    await precacheController.install(event)
    registerHome()
    console.log('Installed')
})
self.addEventListener('activate', event => {
    comChannel.postMessage('activate')
    precacheController.activate(event)
    registerHome()
    console.log('Activated')
})

async function onUpdate() {
    try {
        let foundUpdating = false
        const notRedirectUrls = ['/', '/clear']
        const clients = await self.clients.matchAll({ type: 'window' })
        for (const client of clients) {
            if ((client.url.includes('update') || client.url.includes('install')) || notRedirectUrls.includes(clients[0].url)) {
                foundUpdating = true
            }
        }
        if (!foundUpdating) {
            const updateUrl = new URL('/update', self.location.origin)
            console.log('Updating to ', clients[0]?.url)
            if (clients.length === 1) {
                await clients[0].navigate(updateUrl + `?redirect=${encodeURIComponent(clients[0].url)}`)
            } else {
                await self.clients.openWindow(updateUrl)
            }
        }
    } catch (e) {
        console.error(e)
    }
}

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
                const [year, month, day] = payloadData.date.split('-').map((x: string) => parseInt(x, 10))
                eventTime.setFullYear(year)
                eventTime.setMonth(month - 1)
                eventTime.setDate(day)
                eventTime.setMinutes(payloadData.time % 100)
                eventTime.setHours(Math.floor(payloadData.time / 100))
            }

            if (new Date().getTime() - eventTime.getTime() > 1000 * 60 * 10) { // 10 minutes timeout
                return// discard old messages
            }
            self.registration.showNotification(payload.notification?.title ?? swConfig.messaging.notifications_title ?? 'Notification',
                {
                    title: swConfig.messaging.notifications_title,
                    body: swConfig.messaging.notifications_body,
                    image: swConfig.messaging.notifications_image,
                    icon: swConfig.messaging.notifications_icon,
                    ...payload.notification,
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

addEventListener('message', async (event: MessageEvent) => {
    if (event.data) {
        switch (event.data.type) {
        // Prompt For Update behaviour
        case 'SKIP_WAITING':
            self.skipWaiting()
            break
        case 'CLIENTS_CLAIM':
            self.clients.claim()
            break
        }
    }

    Sentry.addBreadcrumb({
        category: 'message',
        data: event.data,
        timestamp: Date.now(),
        level: 'debug',
    })
})

self.addEventListener('notificationclick', async (event: NotificationEvent) => {
    event.notification.close()
    console.log('[SW] Notification click Received.', event.notification)
    Sentry.addBreadcrumb({
        category: 'notification',
        data: event.notification,
        timestamp: Date.now(),
        level: 'debug',
    })
})

self.addEventListener(
    'pushsubscriptionchange',
    async (event: any) => {
        Sentry.captureMessage('Push subscription change', {
            level: 'debug',
            extra: event,
        })
        const subscription = self.registration.pushManager
            .subscribe(event.oldSubscription.options)
            .then(subscription =>
                fetch('register', {
                    method: 'post',
                    headers: {
                        'Content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        endpoint: subscription.endpoint,
                    }),
                }),
            )
        event.waitUntil(subscription)
    },
    false,
)

//
// Runtime caching
//
const FALLBACK_STRATEGY = new CacheFirst()
// Icons
const iconsRoute = new Route(({ request }) => {
    return request.url.startsWith('https://api.iconify.design/')
}, FALLBACK_STRATEGY)

registerRoute(iconsRoute)

const fallbackRoute = new Route(
    (options) => (swConfig.hostnames.includes(options.url.hostname) || location.hostname == options.url.hostname)
        && options.request.destination !== 'document', // do not cache app's documents as this is a SPA
    new StaleWhileRevalidate(),
)

registerRoute(fallbackRoute)