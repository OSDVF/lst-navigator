<template>
    <article>
        <h1>
            <IconCSS name="mdi:update" />&ensp;Dostupná aktualizace
        </h1>
        <button @click="download">
            <IconCSS name="mdi:download" />&ensp;Stáhnout
        </button>
        <br>
        <ClientOnly>
            <button @click="$pwa.cancelInstall(); prevRoute !== null ? $router.back() : $router.replace('/schedule/0')">
                <IconCSS name="mdi:sync-off" />&ensp;Ignorovat
            </button>
        </ClientOnly>
    </article>
</template>

<script setup lang="ts">
const { $pwa, $Sentry } = useNuxtApp()
const prevRoute = ref<string | null>(null)

onBeforeRouteUpdate((updateGuard) => {
    prevRoute.value = updateGuard.fullPath
})

async function download() {
    $pwa.updateServiceWorker()
    if (process.client) {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const reg of regs) {
            try {
                reg.waiting?.postMessage({ type: 'CLIENTS_CLAIM' })
                reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
            } catch (e) {
                console.error(e)
                $Sentry.captureException(e)
            }
        }
        location.href = '/schedule/0'
    }
}
</script>
