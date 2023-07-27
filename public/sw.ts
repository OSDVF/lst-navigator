import { precacheAndRoute } from 'workbox-precaching'
declare let self: ServiceWorkerGlobalScope

// Precaching behaviour
precacheAndRoute(self.__WB_MANIFEST)

// Prompt For Update behaviour
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') { self.skipWaiting() }
})
