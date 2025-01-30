<template>
    <article>
        <h1><Icon name="mdi:pencil" /> Jméno/Podpis</h1>
        <p>
            {{ $config.public.signatureInfo }}
        </p>
        <NameChangeDialog class="large" />
        <p v-if="!$firebaseAuth.currentUser">
            Pokud chcete vaše data (poznámky, zpětná vazba) zálohovat online, přihlaste se nebo si vytvořte účet.
        </p>
        <LazyLoginField />
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'install',
})
</script>
