<template>
    <article>
        <h1><Icon name="mdi:compass-outline" />&ensp;Vítejte</h1>
        <p>
            {{ config.public.welcome }}
        </p>
    </article>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()

definePageMeta({
    layout: 'install',
})
</script>
