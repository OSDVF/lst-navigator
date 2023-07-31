<template>
    <div>

        <Head>
            <Title>{{ title }}</Title>
        </Head>
        <main>
            <slot />
        </main>
        <div class="navigation">
            <nav role="navigation">
                <NuxtLink to="/info">
                    <IconCSS name="mdi:information" size="2rem" />
                    {{ config.public.title }}
                </NuxtLink>
                <NuxtLink to="/">
                    <IconCSS name="mdi:calendar-text" size="2rem" />
                    Program
                </NuxtLink>
                <NuxtLink to="/settings">
                    <IconCSS name="mdi:cog" size="2rem" />
                    Nastavení
                </NuxtLink>
            </nav>
            <div role="dialog" :class="{ networkError: true, visible: !!cloudStore.networkError }">
                <IconCSS name="mdi:cloud-off" /> Problém s připojením
            </div>
        </div>
        <ProgressBar :class="{ backgroundLoading: true, visible: cloudStore.metaLoading }" />
        <vue-easy-lightbox :visible="ui.visibleRef" :imgs="ui.imagesRef" @hide="ui.visibleRef = false" />
    </div>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'
import { useUI } from '@/stores/ui'
const ui = useUI()
const cloudStore = useCloudStore()
const config = useRuntimeConfig()
const route = useRoute()


const title = computed(() => {
    if (route.meta.title) {
        return `${route.meta.title} · ${config.public.title}`
    }
    return config.public.title
})

</script>

<style lang="scss">
@import "@/assets/styles/constants.scss";

nav {
    display: flex;
    backdrop-filter: $blurred-background;

    &>a {
        flex-basis: 33%;
        padding: .5rem;
        text-align: center;

        &:focus {
            outline: 0;
        }
    }
}

.navigation {
    border-top: 1px solid rgba($link-background, 0.1);

    &>nav>a>span {
        display: block;
        margin: auto;
    }
}

.backgroundLoading,
.navigation {
    bottom: 0;
    left: 0;
    right: 0;
    position: fixed;
}

.networkError {
    flex-basis: 100%;
    flex-grow: 1;
    backdrop-filter: $blurred-background;
    background: rgba($link-background, 0.2);
    text-align: center;
    transition: transform .2s ease, margin-top .2s ease;
    $errorBannerHeight: 2.5rem;

    transform: translateY($errorBannerHeight);
    height: $errorBannerHeight;
    margin-top: -$errorBannerHeight;
    padding: $errorBannerHeight / 5.0;

    &.visible {
        transform: translateY(0rem);
        margin-top: 0;
    }
}

.backgroundLoading {
    transition: transfom .2s ease;
    transform: translateY(3px);

    &.visible {
        transform: translateY(0);
    }
}
</style>
