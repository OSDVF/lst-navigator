<template>
    <LazyProgramSchedule :day="!isNaN(parseInt(dayIndex)) ? parseInt(dayIndex) : 0" />
</template>

<script setup lang="ts">
const router = useRouter()
const dayIndex = computed(() => router.currentRoute.value.params.day as string)
</script>