<template>
    <EventInfo />
</template>

<script setup lang="ts">
definePageMeta({
    title: 'Informace',
})

const cloud = storeToRefs(useCloudStore())
watch(cloud.eventDescription, desc => {
    setTitle('Informace - ' + desc?.title)
}, { immediate: true })
</script>