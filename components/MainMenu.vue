<template>
    <NuxtLink to="/info">
        <Icon name="mdi:information" size="1.8rem" />
        <span class="text">{{ $config.public.title }}</span>
    </NuxtLink>
    <NuxtLink to="/feedback" :class="$route.path.includes('feedback') ? 'router-link-active' : undefined">
        <Icon name="mdi:rss" size="1.8rem" />
        <span class="text">Feedback</span>
    </NuxtLink>
    <NuxtLink to="/schedule">
        <Icon name="mdi:calendar-text" size="1.8rem" />
        <span class="text">Program</span>
    </NuxtLink>
    <NuxtLink v-if="cloudStore.resolvedPermissions.editSchedule" to="/admin">
        <Icon name="mdi:account-cog" size="1.8rem" />
        <span class="text">Administrace</span>
    </NuxtLink>
    <SettingsLink />
</template>

<script setup lang="ts">
const cloudStore = useCloudStore()
</script>