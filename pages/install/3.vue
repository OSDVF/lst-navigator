<template>
    <article>
        <h1><Icon name="mdi:pencil" /> Jméno/Podpis</h1>
        Bude se zobrazovat organizátorům ve zpětné vazbě.
        <NameChangeDialog />
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'install',
})
</script>
