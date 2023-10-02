<template>
    <article>
        {{ $config.public.longName }}
        <noscript>
            Aplikace vyžaduje zapnutý JavaScript.
        </noscript>
        <p class="absolute bottom-25 p-1" style="max-width: 800px">
            Pokud se aplikace nenačte, zkontrolujte, zda máte zapnutý JavaScript, případně adblocker, nebo napište na
            {{ $config.public.supportEmail }}
        </p>
    </article>
</template>

<script setup>
definePageMeta({
    middleware: () => {
        if (typeof window !== 'undefined') {
            return {
                path: '/schedule'
            }
        }
    },
    layout: 'install'
})
</script>
