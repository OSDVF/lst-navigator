<template>
    <article>
        <h1>
            <img v-if="config.public.icon?.includes('/')" class="iconify" :src="config.public.icon" width="36">
            <Icon v-else :name="config.public.icon || 'mdi:compass-outline'" />&ensp;Vítejte
        </h1>
        <p>
            {{ config.public.welcome }}
        </p>
        <p>
            Aplikaci můžete používat jako webovou stránku nebo si ji nainstalovat na své zařízení.
        </p>
        <div class="m-auto"><br>
            <br>
        </div>
        <p>
            <NuxtLink to="/privacy?install=false"><Icon name="mdi:account-lock" /> Zobrazit zásady ochrany soukromí</NuxtLink>
        </p>
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    layout: 'install',
})

const config = useRuntimeConfig()
if (import.meta.browser) {
    const next = inject<Ref<string>>('nextText')
    if (next) {
        next.value = 'Instalovat'
    }
}

</script>
