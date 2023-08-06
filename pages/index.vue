<template>
    <article>{{ $config.public.longName }}</article>
</template>

<script setup>
if (process.client) { useRouter().replace('/schedule') }
</script>
