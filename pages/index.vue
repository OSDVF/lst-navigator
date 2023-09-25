<template>
    <article>{{ $config.public.longName }}</article>
</template>

<script setup>
definePageMeta({
    middleware: () => {
        return {
            path: '/schedule'
        }
    }
})
</script>
