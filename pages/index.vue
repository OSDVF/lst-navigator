<template>
    <article>{{ $config.public.longName }}</article>
</template>

<script setup>
definePageMeta({
    middleware: () => {
        if (typeof window !== 'undefined') {
            return {
                path: '/schedule'
            }
        }
    }
})
</script>
