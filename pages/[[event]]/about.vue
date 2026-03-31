<template>
    <article>
        <h1>{{ $config.public.longName }}</h1>
        <img :src="$config.public.icon" class="noinvert mw-full" alt="Ikona aplikace">

        <p>
            {{ $config.public.welcome }}
        </p>
        <p v-if="$config.public.company">
            Aplikace je vyvíjena ve spolupráci s <a :href="$config.public.companyLink" target="_blank">{{
                $config.public.company }}</a>.
        </p>
        <p>
            Případné chyby hlaste na {{ $config.public.supportEmail }}.
        </p>

        <NuxtLink to="/qr">
            <Icon name="mdi:qrcode" /> Sdílet aplikaci QR kódem
        </NuxtLink><br>
        <NuxtLink
            :to="{
                name: 'privacy',
                params: {
                    event: $route.params.event
                }
            }">
            <Icon name="mdi:account-lock" /> Zobrazit zásady ochrany soukromí
        </NuxtLink>
    </article>
</template>

<script lang="ts" setup>
definePageMeta({
    layout: 'front-page',
})
const route = useRoute()
if(route.params.event) {
    setPageLayout('default')
}

</script>