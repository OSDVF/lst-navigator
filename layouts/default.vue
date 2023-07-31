<template>
    <div>

        <Head>
            <Title>{{ title }}</Title>
        </Head>
        <main>
            <slot />
        </main>
        <nav class="navigation" role="navigation">
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
            <IconCSS name="mdi:offline" /> Problém s připojením
        </div>
        <ProgressBar :class="{backgroundLoading:true, visible: !!cloudStore.networkLoading}" />
    </div>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'
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

nav.navigation {
    display: flex;
    border-top: 1px solid rgba($link-background, 0.1);
    backdrop-filter: blur(15px) grayscale(50%);

    &>a {
        flex-basis: 33%;
        padding: .5rem;
        text-align: center;

        &>span {
            display: block;
            margin: auto;
        }

        &:focus {
            outline: 0;
        }
    }
}
.networkError, .backgroundLoading, nav.navigation {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    transition: transfom .2s ease;
}
.networkError {
    height: 1rem;
    transform: translateY(1rem);

    &.visible {
        transform: translateY(0);
    }
}

.backgroundLoading {
    transform: translateY(3px);

    &.visible {
        transform: translateY(0);
    }
}
</style>
