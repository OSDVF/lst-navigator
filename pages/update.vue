<template>
    <article>
        <h1>
            <IconCSS name="mdi:update" />&ensp;Dostupná aktualizace
        </h1>
        <button @click="download">
            <IconCSS name="mdi:download" />&ensp;Stáhnout
        </button>
        <br>
        <button @click="$pwa.cancelInstall; prevRoute !== null ? $router.back() : $router.replace('/schedule/0')">
            <IconCSS name="mdi:sync-off" />&ensp;Ignorovat
        </button>
    </article>
</template>

<script setup lang="ts">
const prevRoute = ref<string | null>(null)

onBeforeRouteUpdate((updateGuard) => {
    prevRoute.value = updateGuard.fullPath
})

function download() {
    useNuxtApp().$pwa.updateServiceWorker().then(() => { location.href = '/schedule' })
}
</script>
