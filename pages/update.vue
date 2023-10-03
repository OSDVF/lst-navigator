<template>
    <article>
        <Head>
            <meta http-equiv="Cache-control" content="no-cache">
            <meta http-equiv="Expires" content="-1">
        </Head>
        <h1>
            <IconCSS name="mdi:update" />&ensp;Dostupná aktualizace
        </h1>
        <button @click="download">
            <IconCSS name="mdi:download" />&ensp;Stáhnout
        </button>
        <br>
        <ClientOnly>
            <button @click="$pwa.cancelInstall(); prevRoute !== null ? $router.back() : goToRedirectedFrom()">
                <IconCSS name="mdi:sync-off" />&ensp;Ignorovat
            </button>
        </ClientOnly>
        <p class="small">
            Pokud se vám nedaří aktualizovat, zkuste vynutit obnovení pomocí <kbd>Ctrl+F5</kbd> nebo <kbd><IconCSS name="mdi:apple-keyboard-command" />+Shift+R</kbd> na MacOS.
        </p>
    </article>
</template>

<script setup lang="ts">
const { $pwa, $Sentry } = useNuxtApp()
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

async function download() {
    const updatePromise = $pwa.updateServiceWorker()
    if (process.client) {
        const regs = await navigator.serviceWorker?.getRegistrations()
        for (const reg of regs) {
            const currentState = (reg.waiting ?? reg.installing ?? reg.active)
            try {
                currentState?.postMessage({ type: 'CLIENTS_CLAIM' })
                currentState?.postMessage({ type: 'SKIP_WAITING' })
            } catch (e) {
                console.error(e)
                $Sentry.captureException(e)
            }
        }
        const path = router.currentRoute.value.fullPath
        await router.push({
            path,
            query: {
                ...router.currentRoute.value.query,
                installed: 'true'
            }
        })
        updatePromise.finally(() => { location.reload(true) })
    }
}

function goToRedirectedFrom() {
    const redirectString = router.currentRoute.value.query.redirect as string
    if (redirectString?.includes('://')) {
        const url = new URL(redirectString)
        router.replace(`${url.pathname}${url.search}${url.hash}`)
    } else {
        router.replace(redirectString ?? '/schedule')
    }
}
</script>
