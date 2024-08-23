<template>
    <NuxtLink to="/settings">
        <img v-show="showImage" :src="cloudStore.user.auth?.photoURL ?? ''" class="noinvert round-full w-1_8" referrerPolicy="no-referrer" crossorigin="anonymous" @load="loaded = true">
        <Icon v-show="!showImage" name="mdi:cog" size="1.8rem" />
        {{ cloudStore.user.auth?.displayName || 'Nastavení' }}
    </NuxtLink>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'

const cloudStore = useCloudStore()
const loaded = ref(false)
const showImage = computed(() => cloudStore.user.auth?.photoURL && loaded.value)
</script>
