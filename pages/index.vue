<template>
    <article class="md-nogaps">
        <div class="ml-2" style="overflow: hidden;">
            <template v-if="$config.public.frontPageImage">
                <br>
                <NuxtLink :to="$config.public.frontPageLink" target="_blank">
                    <RemoteImage
                        style="max-width: 100%; height: 3rem; margin: .5rem;"
                        :src="$config.public.frontPageImage" />
                </NuxtLink>
            </template>
            <NuxtLink
                v-if="$config.public.frontPageLink" style="float: right; margin-right: 2rem;"
                :to="$config.public.frontPageLink">Přejít na hlavní web</NuxtLink>
            <h1>{{ $config.public.frontPageTitle }}</h1>
        </div>
        <noscript>
            Aplikace vyžaduje zapnutý JavaScript.
        </noscript>
        <NuxtLink
            v-for="event in cloud.visibleEvents" :key="event.id" v-slot="link" :to="`/${event.id}/preview`"
            custom>
            <EventCard :event="event" :link="link"/>
        </NuxtLink>
        <p v-if="!cloud.visibleEvents.length">
            <Icon name="mdi:info-outline" />&ensp;Momentálně nejsou dostupné žádné události k přihlášení, prohlížení, nebo zpětné
            vazbě.
        </p>
        <details class="p-1 p" style="max-width: 800px">
            <summary class="a nomarker">Řešení potíží</summary>
            Při problémech s aplikací zkuste <NuxtLink class="strong inline" to="/update" @click.stop.prevent="reload">obnovit aktuální verzi</NuxtLink>. <br>
            Pokud se aplikace nenačte, zkontrolujte, zda máte zapnutý JavaScript, případně adblocker, nebo napište na
            {{ $config.public.supportEmail }}
        </details>
        <small>
            <NuxtLink
                v-if="!cloud.visibleEvents.length"
                :to="`/${cloud.eventsCollection[0]?.id ?? cloud.selectedEvent}/admin`">
                Administrace</NuxtLink>
        </small>
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    name: 'front-page',
    path: '/:event?',
    layout: 'front-page',
    layoutTransition: {
        name: 'slide-left',
    },
    pageTransition: {
        name: 'slide-left',
    },
    middleware(to) {//redirect
        if (to.params.event && Object.keys(to.params).length == 1) {
            return navigateTo(`/${to.params.event}/preview`)
        }
    },
})

function reload() {
    location.reload(true)
}

const cloud = useCloudStore()
const router = useRouter()

// Replace the home page with the first and only available event
watch(() => cloud.visibleEvents, e => {
    if (e.length == 1) {
        router.replace(`/${cloud.visibleEvents[0].id}/preview`)
    }
}, { immediate: true })

if (import.meta.browser && router.currentRoute.value.params.event) {
    const installed = useInstallComplete()
    const route = useRoute()
    if (installed.value && route.params.event) {
        setTimeout(() => navigateTo({
            path: `/${route.params.event}/schedule/`,// timeout 0 for consistency with layout change
            replace: true,
        }), 0)
    }
}
</script>

<style lang="scss">
@use '@/assets/styles/constants' as c;
@use 'sass:color';

.card {
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    cursor: pointer;

    a {
        font-weight: bold;
        text-transform: uppercase;
        font-size: 1.2rem;
        padding: 1.2rem 0;
        display: flex;
        align-items: stretch;
        justify-content: center;
        flex-grow: 1;

        &:not(:hover) {
            color: inherit;
        }
    }

    img {
        object-fit: cover;
        width: 100%;
        max-height: 50vh;
    }

    nav {
        background: color.adjust($color: c.$link-background, $alpha: 0.3);
        backdrop-filter: c.$blurred-background;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
        align-items: center;
        mask: linear-gradient(transparent, black, black);
    }
}

details:not([open]) .nomarker::marker {
    content: '';
}

@media screen and (max-width:800px) {
    .md-nogaps {
        padding: 0;
    }
}
</style>