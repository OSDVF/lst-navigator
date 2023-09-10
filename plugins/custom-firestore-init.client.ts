import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { defineNuxtPlugin } from 'nuxt/app'

export default defineNuxtPlugin({
    order: 100,
    setup() {
        const firebaseApp = useFirebaseApp()
        try {
            initializeFirestore(firebaseApp, {
                localCache:
                    process.client ? persistentLocalCache(/* settings */{ tabManager: persistentMultipleTabManager() }) : undefined
            })
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(e)
        }
    }
})
