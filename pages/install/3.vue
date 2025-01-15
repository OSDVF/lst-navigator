<template>
    <article>
        <h1><Icon name="mdi:pencil" /> Jméno/Podpis</h1>
        Volitelně můžete zadat své jméno/podpis. Bude se zobrazovat organizátorům ve zpětné vazbě. Jedno jméno může použít jen jeden člověk.
        <NameChangeDialog />
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'install',
})
</script>
