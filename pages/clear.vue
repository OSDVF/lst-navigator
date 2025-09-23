<template>
    <article>
        Probíhá mazání dat aplikace...
        <noscript>
            Pokud se stránka neobnoví automaticky, klikni na tlačítko.
        </noscript>
        <a :href="home">
            <button>
                <Icon name="mdi:home" />
                Zpátky do aplikace
            </button>
        </a>
    </article>
</template>

<script setup lang="ts">
import * as Sentry from '@sentry/nuxt'
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore'

const router = useRouter()
const config = useRuntimeConfig()
const home = config.public.installWizard ? '/install/0' : '/schedule'

watch(router.currentRoute, (value) => {
    if (value.query.cleared) { router.replace(home) }
}, { immediate: true })

onMounted(async () => {
    if (router.currentRoute.value.query.cleared) {
        router.replace(home)
        return
    }
    const f = useFirestore()
    terminate(f).then(() => {
        clearIndexedDbPersistence(f).catch((e) => {
            if (process.env.SENTRY_DISABLED !== 'true') {
                Sentry.captureException(e)
            }
        })
    })

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
