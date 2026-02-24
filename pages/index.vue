<template>
    <article class="md-nogaps">
        <div class="ml-2" style="overflow: hidden;">
            <template v-if="$config.public.frontPageImage">
                <br>
                <NuxtLink :to="$config.public.frontPageLink">
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
        <div v-for="event in cloud.eventsCollection" :key="event.id" :value="event.id" class="card p">
            <EventImage class="noinvert" :event="event.id" />
            <nav>
                <NuxtLink :to="`/${event.id}/apply`">
                    <Icon name="mdi:form-select" size="1.8rem" />&ensp;Přihláška
                </NuxtLink>
                <NuxtLink :to="event.id">
                    <Icon name="mdi:calendar" size="1.8rem" />&ensp; Program
                </NuxtLink>
            </nav>
        </div>
        <details class="p-1 p" style="max-width: 800px">
            <summary class="a nomarker">Řešení potíží</summary>
            Pokud se aplikace nenačte, zkontrolujte, zda máte zapnutý JavaScript, případně adblocker, nebo napište na
            {{ $config.public.supportEmail }}
        </details>
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    path: '/:event?',
    layout: 'front-page',
    layoutTransition: {
        name: 'slide-left',
    },
    middleware(to){//redirect
        if(to.params.event && Object.keys(to.params).length == 1) {
            return navigateTo(`/${to.params.event}/schedule`)
        }
    },
})

const cloud = useCloudStore()
const route = useRoute()

if (import.meta.browser && route.params.event) {
    const installed = useInstallComplete()
    if (installed.value) {
        setTimeout(() => navigateTo({
            path: `/${cloud.selectedEvent}/schedule/`,// timeout 0 for consistency with layout change
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

    $nav-height: 4.5rem;
    $link-background: color.adjust($color: c.$link-background, $alpha: 0.2);

    &::after {
        content: '';
        backdrop-filter: c.$blurred-background;
        background-color: $link-background;
        mask: linear-gradient(transparent, transparent, black);
        position: absolute;
        inset: 0;
        top: 40%;
        bottom: $nav-height;
    }

    a {
        font-weight: bold;
        text-transform: uppercase;
        font-size: 1.2rem;
        height: 100%;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;

        &:not(:hover) {
            background-color: $link-background;
            color: inherit;
        }
    }

    img {
        object-fit: cover;
        width: 100%;
        max-height: 50vh;
    }

    nav {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
        height: $nav-height;
        align-items: center;
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