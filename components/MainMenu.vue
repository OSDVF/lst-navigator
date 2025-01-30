<template>
    <NuxtLink to="/info">
        <Icon name="mdi:information" size="1.8rem" />
        {{ $config.public.title }}
    </NuxtLink>
    <NuxtLink to="/schedule">
        <Icon name="mdi:calendar-text" size="1.8rem" />
        Program
    </NuxtLink>
    <NuxtLink v-if="cloudStore.resolvedPermissions.editSchedule" to="/admin">
        <Icon name="mdi:account-cog" size="1.8rem" />
        Administrace
    </NuxtLink>
    <SettingsLink />
</template>

<script setup lang="ts">
const cloudStore = useCloudStore()
</script>