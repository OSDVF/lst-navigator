<template>
    <article>
        Probíhá mazání dat aplikace...
        <noscript>
            Pokud se stránka neobnoví automaticky, klikni na tlačítko.
        </noscript>
        <a href="/">
            <button>
                <IconCSS name="mdi:home" />
                Zpátky do aplikace
            </button>
        </a>
    </article>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const router = useRouter()
onMounted(async() => {
    if (router.currentRoute.value.query.cleared) {
        router.replace('/')
        return
    }

    // Clear indexedDB
    for (const db of await indexedDB.databases?.() ?? ['firebaseLocalStorageDb', 'firebase-heartbeat-database', 'composi-idb', `firestore/[DEFAULT]/${config.public.vuefire.config.appId}/main`]) {
        if (db.name) { indexedDB.deleteDatabase(db.name) }
    }

    // Clear localStorage
    localStorage.clear()

    // Clear cookies
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
    }

    // Clear sessionStorage
    sessionStorage.clear()

    // Clear cache
    caches.keys().then(function(names) {
        for (const name of names) {
            caches.delete(name)
        }
    })

    // Clear service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for (const registration of registrations) {
                registration.unregister()
            }
        })
    }

    await router.replace({
        path: router.currentRoute.value.path,
        query: {
            cleared: 'true'
        }
    })
    location.reload(true)
})
</script>
