<template>
    <article>
        <h1><Icon name="mdi:pencil" /> Jméno/Podpis</h1>
        <p>
            {{ $config.public.signatureInfo }}
        </p>
        <NameChangeDialog class="large" />
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'install',
})
</script>
