<template>
    <NuxtErrorBoundary @error="captureError">

        <Head>
            <Title>{{ title }}</Title>
        </Head>
        <main
            :style="{
                'background': globalBackground ? `linear-gradient(0deg, transparent, ${globalBackground})` : undefined,
                'overflow-x': trainsitioning ? 'hidden' : undefined,
            }"
        >
            <slot />
        </main>
        <div class="navigation">
            <nav role="navigation">
                <NuxtLink to="/info">
                    <IconCSS name="mdi:information" size="2rem" />
                    {{ config.public.title }}
                </NuxtLink>
                <NuxtLink to="/schedule">
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

        <template #error="{ error, clearError }">
            <main>
                <article>
                    <h1>Chyba</h1>
                    <p>
                        <code>{{ error }}</code>
                    </p>
                    <button @click="clearError">
                        Zkusit znovu
                    </button>
                </article>
            </main>

        </template>
    </NuxtErrorBoundary>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'
import { useUI } from '@/stores/ui'
import { useSettings } from '@/stores/settings'

const app = useNuxtApp()
const ui = useUI()
const cloudStore = useCloudStore()
const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const settings = useSettings()
const installStep = settings.getInstallStep()
const Sentry = app.$Sentry as typeof import('@sentry/vue/types')

///
/// Redirection guards
///
installStep.then((step) => {
    const safeStep = step ?? 0
    if (safeStep < config.public.installStepCount) {
        router.push('/install/' + safeStep)
    }
})

if (app.$pwa.needRefresh) {
    router.push('/update')
}

app.$onUpdateCallback(() => {
    router.push('/update')
})

const title = computed(() => {
    if (route.meta.title) {
        return `${route.meta.title} · ${config.public.title}`
    }
    return config.public.title
})

const trainsitioning = ref(false)
provide('trainsitioning', trainsitioning)
const globalBackground = ref('')
provide('globalBackground', globalBackground)

function captureError(error: unknown) {
    // eslint-disable-next-line no-console
    console.error(error, error instanceof TypeError ? error.stack : null)
    Sentry.captureException(error)
}

</script>

<style lang="scss">
@use "sass:math";
@import "@/assets/styles/constants.scss";

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
    padding: math.div($errorBannerHeight, 5.0);

    &.visible {
        transform: translateY(0rem);
        margin-top: 0;
    }
}

.backgroundLoading {
    transition: transfom .2s ease;
    transform: translateY(6px);

    &.visible {
        transform: translateY(0);
    }
}
</style>
