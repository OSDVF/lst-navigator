<template>
    <NuxtLink :to="`/update?redirect=${encodeURIComponent($router.currentRoute.value.fullPath)}`">
        <button type="button" @click="forceUpdate">
            <IconCSS name="mdi:reload-alert" />
            Přeaktualizovat
        </button>
    </NuxtLink>
    <NuxtLink to="/clear">
        <button type="button">
            <IconCSS name="mdi:delete" />
            Smazat data
        </button>
    </NuxtLink>
</template>

<script setup lang="ts">
async function forceUpdate() {
    for (const registration of await navigator.serviceWorker.getRegistrations()) {
        registration.update()
    }
}
</script>
