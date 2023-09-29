import { useSettings } from '~/stores/settings'

// This variable will save the event for later use.
let deferredPrompt: BeforeInstallPromptEvent | null = null
window.addEventListener('beforeinstallprompt', (e: BeforeInstallPromptEvent) => {
    // Prevents the default mini-infobar or install dialog from appearing on mobile
    e.preventDefault()
    // Save the event because you'll need to trigger it later.
    deferredPrompt = e
    // Show your customized install prompt for your PWA
    // Your own UI doesn't have to be a single element, you
    // can have buttons in different locations, or wait to prompt
    // as part of a critical journey
})
const onUpdateCallback = ref((_reg?: ServiceWorkerRegistration) => { })
let updateFound = false

export default defineNuxtPlugin({
    parallel: true,
    hooks: {
        async 'app:mounted'(app) {
            const firebaseApp = useFirebaseApp()
            const settings = useSettings()
            const config = useRuntimeConfig()
            const swRegistraions = process.client && navigator.serviceWorker ? await navigator.serviceWorker?.getRegistrations() : []
            for (const registration of swRegistraions) {
                registration?.addEventListener('updatefound', () => {
                    registration.installing?.addEventListener('statechange', async (ev) => {
                        if ((ev.target as ServiceWorker).state === 'activated' && (await settings.getInstallStep() ?? 0) >= config.public.installStepCount) {
                            console.log('Update found')
                            onUpdateCallback.value(registration)
                            updateFound = true
                        }
                    })
                })
                if (registration.waiting) {
                    console.log('Waiting found')
                    onUpdateCallback.value(registration)
                    updateFound = true
                }
                try {
                    registration.active?.postMessage({
                        type: 'INITIALIZE_APP',
                        config: {
                            ...firebaseApp.options,
                            defaultNotification: { ...app.$nuxt.$config.public.messagingConfig }
                        }
                    })
                } catch (e) {
                    console.error(e)
                    app.$nuxt.$Sentry.captureException(e)
                }
            }
        }
    },
    setup() {
        return {
            provide: {
                deferredPrompt() { return deferredPrompt },
                installPromptSupport() { return 'BeforeInstallPromptEvent' in window },
                onUpdateCallback(callback: () => void) {
                    onUpdateCallback.value = callback
                    if (updateFound) {
                        callback()
                    }
                }
            }
        }
    }
})
