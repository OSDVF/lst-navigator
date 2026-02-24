<template>
    <article />
</template>
<script setup lang="ts">
const router = useRouter()
router.replace(`/${router.currentRoute.value.params.event}/admin/events`)
</script>
