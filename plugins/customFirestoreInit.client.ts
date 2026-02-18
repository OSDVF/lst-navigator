import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { defineNuxtPlugin } from 'nuxt/app'
import * as Sentry from '@sentry/nuxt'

export default defineNuxtPlugin({
    hooks: {
        'app:beforeMount': () => {
            const config = useRuntimeConfig()
            if (config.public.emulators) { return }

            const firebaseApp = useFirebaseApp()
            try {
                initializeFirestore(firebaseApp, {
                    localCache:
                        import.meta.browser ? persistentLocalCache(/* settings */{ tabManager: persistentMultipleTabManager() }) : undefined,
                })
            } catch (e) {
                Sentry.captureException(e)
                console.error(e)
            }
        },
    },
})
