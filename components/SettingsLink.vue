<template>
    <NuxtLink :to="`/${cloud.selectedEvent}/settings`" :title="showImage ? 'Nastavení a účet' : undefined">
        <img v-show="showImage" ref="img" :src="cloud.user.auth?.photoURL ?? ''" class="noinvert round-full w-1_8" referrerPolicy="no-referrer" crossorigin="anonymous" @load="loaded = true">
        <Icon v-show="!showImage" name="mdi:cog" size="1.8rem" />
        <span class="text">{{ cloud.user.auth?.displayName || 'Nastavení' }}</span>
    </NuxtLink>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'

const cloud = useCloudStore()
const loaded = ref(false)
const img = ref<HTMLImageElement>()
const showImage = computed(() => cloud.user.auth?.photoURL && (loaded.value || img.value?.complete))
</script>
