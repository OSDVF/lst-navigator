<template>
    <article>
        <h1>
            <Icon name="mdi:compass-outline" />&ensp;Vítejte
        </h1>
        <p>
            {{ config.public.welcome }}
        </p>
        <p>
            Aplikaci můžete používat jako webovou stránku nebo si ji nainstalovat na své zařízení.
        </p>
    </article>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()

definePageMeta({
    layout: 'install',
})
const next = inject<Ref<string>>('nextText')
if (next) {
    next.value = 'Instalovat'
}

</script>
