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
onMounted(async () => {
    if (router.currentRoute.value.query.cleared) {
        router.replace('/')
        return
    }

    // Clear indexedDB
    for (const db of await indexedDB.databases?.() || ['firebaseLocalStorageDb', 'firebase-heartbeat-database', 'keyval-store', `firestore/[DEFAULT]/${config.public.vuefire.config.appId}/main`]) {
        if (db.name) { await new Promise(resolve => indexedDB.deleteDatabase(db.name!).addEventListener('success', resolve)) }
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
    const names = await caches.keys()
    for (const name of names) {
        await caches.delete(name)
    }

    // Clear service worker
    if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.getRegistrations().then(async function (registrations) {
            for (const registration of registrations) {
                await registration.unregister()
            }
        })
    }

    await router.replace({
        path: router.currentRoute.value.path,
        query: {
            cleared: 'true',
        },
    })
    location.reload(true)
})
</script>
