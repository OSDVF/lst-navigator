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
if (import.meta.browser) {
    const installed = useInstallComplete()
    if (installed.value) {
        setTimeout(() => navigateTo({
            path: '/schedule',// timeout 0 for consistency with layout change
            replace: true,
        }), 0)
    }
}

definePageMeta({
    layout: 'install',
})
</script>
