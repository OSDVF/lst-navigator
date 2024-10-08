<template>
    <article>
        <h1><Icon name="mdi:compass-outline" />&ensp;Vítejte</h1>
        <p>
            Aplikace {{ config.public.longName }} vám pomůže v orientaci v harmonogramu, protože každý není
            předseda SOMu, aby měl přehled o všem, co se děje, že.
        </p>
    </article>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()

definePageMeta({
    layout: 'install',
})
</script>
