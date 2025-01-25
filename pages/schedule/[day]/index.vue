<template>
    <LazyProgramSchedule :day="p.day" />
</template>

<script setup lang="ts">
const p = defineProps<{ day: number }>()
</script>