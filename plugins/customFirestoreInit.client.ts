import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'
import { defineNuxtPlugin } from 'nuxt/app'

export default defineNuxtPlugin({
    hooks: {
        'app:beforeMount': () => {
            const firebaseApp = useFirebaseApp()
            try {
                initializeFirestore(firebaseApp, {
                    localCache:
                    import.meta.browser ? persistentLocalCache(/* settings */{ tabManager: persistentMultipleTabManager() }) : undefined,
                })
            } catch (e) {
             
                console.error(e)
            }
        },
    },
})
