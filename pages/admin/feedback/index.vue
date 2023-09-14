<template>
    <article>
        <h1>Nastavení zpětné vazby</h1>
        <NuxtLink to="/admin/feedback/result">
            <button>
                <IconCSS name="mdi:spreadsheet" />
                Výsledky
            </button>
        </NuxtLink>
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    title: 'Zpětná vazba',
    layout: 'admin',
    middleware: ['auth']
})
</script>
