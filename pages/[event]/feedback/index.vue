<template>
    <article />
</template>
<script setup>
const installed = useInstallComplete()
if (installed.value) {
    const router = useRouter()
    router.replace(`/${router.currentRoute.value.params.event}/feedback/0`)
}
</script>
