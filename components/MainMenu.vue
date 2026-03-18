<template>
    <NuxtLink :to="`/${cloud.selectedEvent}/info`" >
        <Icon name="mdi:information" size="1.8rem" />
        <span class="text">{{ cloud.eventDescription?.title ?? $config.public.title }}</span>
    </NuxtLink>
    <NuxtLink v-if="feedbackEnabled(cloud.eventDescription)" :to="`/${cloud.selectedEvent}/feedback`" :class="$route.path.includes('feedback') ? 'router-link-active' : undefined">
        <Icon name="mdi:rss" size="1.8rem" />
        <span class="text">Feedback</span>
    </NuxtLink>
    <NuxtLink :to="`/${cloud.selectedEvent}/schedule`">
        <Icon name="mdi:calendar-text" size="1.8rem" />
        <span class="text">Program</span>
    </NuxtLink>
    <NuxtLink v-if="cloud.resolvedPermissions.editSchedule" :to="`/${cloud.selectedEvent}/admin`">
        <Icon name="mdi:account-cog" size="1.8rem" />
        <span class="text">Administrace</span>
    </NuxtLink>
    <SettingsLink />
</template>

<script setup lang="ts">
const cloud = useCloudStore()
</script>