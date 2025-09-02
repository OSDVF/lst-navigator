<template>
    <div style="display: none;" />
</template>

<script lang="ts" setup>
onMounted(() => {
    const hydrated = useNuxtApp().$hydrated!
    hydrated!.value = true
})
</script>