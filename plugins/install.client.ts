import { useSettings } from '~/stores/settings'
import * as Sentry from '@sentry/nuxt'

// This variable will save the event for later use.
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
window.addEventListener('beforeinstallprompt', (e: BeforeInstallPromptEvent) => {
    // Prevents the default mini-infobar or install dialog from appearing on mobile
    //e.preventDefault()
    // Save the event because you'll need to trigger it later.
    deferredPrompt.value = e
    // Show your customized install prompt for your PWA
    // Your own UI doesn't have to be a single element, you
    // can have buttons in different locations, or wait to prompt
    // as part of a critical journey
})
const onUpdateCallback = ref((_reg?: ServiceWorkerRegistration) => { })
const updateFound = ref(false)

export default defineNuxtPlugin({
    parallel: true,
    hooks: {
        async 'app:mounted'(app) {
            const firebaseApp = useFirebaseApp()
            const settings = useSettings()
            const config = useRuntimeConfig()
            const swRegistraions = import.meta.client && navigator.serviceWorker ? await navigator.serviceWorker?.getRegistrations() : []
            for (const registration of swRegistraions) {
                registration?.addEventListener('updatefound', () => {
                    updateFound.value = true
                    registration.installing?.addEventListener('statechange', async (ev) => {
                        if ((ev.target as ServiceWorker).state === 'activated' && (settings.installStep ?? 0) >= config.public.installStepCount) {
                            console.log('Update found')
                            onUpdateCallback.value(registration)
                        }
                    })
                })
                if (registration.waiting) {
                    console.log('Waiting found')
                    updateFound.value = true
                    onUpdateCallback.value(registration)
                }
                try {
                    registration.active?.postMessage({
                        type: 'INITIALIZE_APP',
                        config: {
                            ...firebaseApp.options,
                            defaultNotification: app.$nuxt.$config.public.notifications_title ? {
                                title: app.$nuxt.$config.public.notifications_title,
                                body: app.$nuxt.$config.public.notifications_body,
                                image: app.$nuxt.$config.public.notifications_image,
                                icon: app.$nuxt.$config.public.notifications_icon,
                                vapidKey: app.$nuxt.$config.public.notifications_vapidKey,
                            } : undefined,
                        },
                    })
                } catch (e) {
                    console.error(e)
                    Sentry.captureException(e)
                }
            }
        },
    },
    setup() {
        return {
            provide: {
                deferredPrompt,
                installPromptSupport() { return 'BeforeInstallPromptEvent' in window },
                onUpdateCallback(callback: () => void) {
                    onUpdateCallback.value = callback
                    if (updateFound.value) {
                        callback()
                    }
                },
                updateFound,
            },
        }
    },
})
