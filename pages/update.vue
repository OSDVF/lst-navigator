<template>
    <article>
        <Head>
            <meta http-equiv="Cache-control" content="no-cache">
            <meta http-equiv="Expires" content="-1">
        </Head>
        <h1>
            <Icon name="mdi:update" />&ensp;Aktualizace
        </h1>
        <p v-if="$pwa?.offlineReady">
            <Icon name="mdi:check" />&ensp;Staženo
        </p>
        <p v-else>
            <Icon name="mdi:alert" />&ensp;Soubory aplikace ještě nejsou staženy
            <ProgressBar class="mt-1" />
        </p>
        <button @click="download">
            <Icon name="mdi:download" />&ensp;Aktualizovat
        </button>
        <br>
        <LazyClientOnly>
            <button @click="$pwa?.cancelInstall(); prevRoute !== null ? router.back() : goToRedirectedFrom()">
                <Icon name="mdi:sync-off" />&ensp;Ignorovat
            </button>
        </LazyClientOnly>
        <p class="small">
            Pokud se vám nedaří aktualizovat, zkuste vynutit obnovení pomocí <kbd>Ctrl+F5</kbd> nebo <kbd>
                <Icon name="mdi:apple-keyboard-command" />+Shift+R
            </kbd> na MacOS.
        </p>
    </article>
</template>

<script setup lang="ts">
import * as Sentry from '@sentry/nuxt'

const { $pwa } = useNuxtApp()
const prevRoute = ref<string | null>(null)
const router = useRouter()

onBeforeRouteUpdate((updateGuard) => {
    prevRoute.value = updateGuard.fullPath
})

onMounted(() => {
    if (router.currentRoute.value.query.installed) {
        goToRedirectedFrom()
    }
})

async function repairWorkerState() {
    const regs = await navigator.serviceWorker?.getRegistrations()
    for (const reg of regs) {
        const currentState = (reg.waiting ?? reg.installing ?? reg.active)
        try {
            currentState?.postMessage({ type: 'CLIENTS_CLAIM' })
            currentState?.postMessage({ type: 'SKIP_WAITING' })
        } catch (e) {
            console.error(e)
            Sentry.captureException(e)
        }
    }
}

async function download() {
    const updatePromise = $pwa?.updateServiceWorker()
    if (import.meta.client) {
        await repairWorkerState()
        const path = router.currentRoute.value.fullPath
        await router.replace({
            path,
            query: {
                ...router.currentRoute.value.query,
                installed: 'true',
            },
        })
        updatePromise?.finally(() => { if(confirm('Aktualizováno - přenačíst aplikaci?'))  {
            location.reload(true)
        } })
    }
}

function goToRedirectedFrom() {
    repairWorkerState()
    const redirectString = router.currentRoute.value.query.redirect as string
    if (redirectString?.includes('://')) {
        const url = new URL(redirectString)
        router.replace(`${url.pathname}${url.search}${url.hash}`)
    } else {
        router.replace(redirectString ?? '/schedule')
    }
}
</script>
