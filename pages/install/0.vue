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
definePageMeta({
    layout: 'install',
})

const config = useRuntimeConfig()

const next = inject<Ref<string>>('nextText')
if (next) {
    next.value = 'Instalovat'
}

</script>
