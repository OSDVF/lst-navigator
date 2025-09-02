<template>
    <article />
</template>
<script setup>
const installed = useInstallComplete()
if (installed.value) {
    const router = useRouter()
    router.replace('/feedback/0')
}
</script>
