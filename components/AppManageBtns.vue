<template>
    <NuxtLink :to="`/update?redirect=${encodeURIComponent(route.fullPath)}`">
        <button type="button" @click="forceUpdate">
            <Icon name="mdi:reload-alert" />
            Přeaktualizovat aplikaci
        </button>
    </NuxtLink>
    <NuxtLink to="/clear">
        <button type="button">
            <Icon name="mdi:delete" />
            Tovární nastavení
        </button>
    </NuxtLink>
</template>

<script setup lang="ts">
const route = useRoute()

async function forceUpdate() {
    for (const registration of await navigator.serviceWorker.getRegistrations()) {
        registration.update()
    }
}
</script>
