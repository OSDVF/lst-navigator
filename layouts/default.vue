<template>
    <div>

        <Head>
            <Title>{{ title }}</Title>
        </Head>
        <ErrorSolver>
            <main
                :style="{
                    'background': `linear-gradient(0deg, transparent, var(--background, ${globalBackground ?? 'transparent'}))`,
                    '--background': globalBackground || 'transparent',
                    'transition': '--background .3s',
                    'min-height': '75vh',
                    'overflow-x': transitioning ? 'hidden' : undefined,
                }">
                <slot />
            </main>
        </ErrorSolver>
        <div class="navigation">
            <div class="flex-full">
                <ProgressBar v-if="cloudStore.feedback.fetching" />
                <nav v-if="cloudStore.feedback.fetchFailed" class="p-1">
                    {{ cloudStore.feedback.error ||
                        'Nepodařilo se odeslat tvou odpověď. Ale žádný strach, je uložená offline ve tvém zařízení.' }}
                </nav>
            </div>
            <div id="additionalNav" class="flex-full" />
            <nav role="navigation">
                <LazyClientOnly>
                    <MainMenu
                        v-if="route.name?.toString().includes('install') || settings.installStep >= config.public.installStepCount" />
                    <NuxtLink v-else :to="onFeedbackPage ? '/schedule?install=false' : `/install/${settings.installStep}`" >
                        <Icon
                            :name="onFeedbackPage ? 'mdi:calendar-month-outline' : 'mdi:arrow-left-bold-circle-outline'"
                            size="1.8rem" />
                        {{ onFeedbackPage ? 'Zobrazit harmonogram a informace...' :
                            'K instalaci aplikace...' }}
                    </NuxtLink>
                </LazyClientOnly>
            </nav>
            <div
                role="dialog" :class="{
                    networkError: true, visible: !!cloudStore.networkError,
                //TODO offline alert?
                }" @click="alert(cloudStore.networkError?.message)">
                <Icon name="mdi:cloud-off" /> Problém s připojením
            </div>
        </div>
        <ProgressBar v-show="isServer || cloudStore.eventLoading" class="backgroundLoading" />
        <LazyClientOnly>
            <vue-easy-lightbox :visible="ui.visibleRef" :imgs="ui.imagesRef" @hide="ui.visibleRef = false" />
        </LazyClientOnly>
    </div>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'
import { useUI } from '@/stores/ui'
import { useSettings } from '@/stores/settings'
import type { RouteLocationRaw } from '#vue-router'

const app = useNuxtApp()
const ui = useUI()
const cloudStore = useCloudStore()
const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const settings = useSettings()
const isServer = ref(import.meta.server)

function alert(message?: string) {
    if (message) {
        window.alert(message)
    }
}

const onFeedbackPage = computed(() => route.name?.toString().includes('feedback') ?? false)
const safeRoute = computed<boolean>(() => route.query.pwa == 'true' || route.query.install == 'false' || onFeedbackPage.value || (route.name as string)?.includes('install') || (route.path as string)?.includes('login'))
watchEffect(() => {
    if (!safeRoute.value && settings.installStep < config.public.installStepCount) {
        router.replace('/install/' + settings.installStep)
    }
})

onMounted(() => {
    isServer.value = false
    ///
    /// Redirection guards
    ///
    const redirectRoute: RouteLocationRaw = {
        path: '/update',
        query: {
            redirect: (route.path === '/update' ? route.query.redirect : null) ?? route.fullPath,
        },
    }
    if (app.$pwa?.needRefresh) {
        router.replace(redirectRoute)
    }

    app.$onUpdateCallback(() => {
        router.replace(redirectRoute)
    })
})

const title = computed(() => {
    if (route.meta.title) {
        return `${route.meta.title} · ${config.public.title}`
    }
    return config.public.title
})

const transitioning = ref(false)
provide('transitioning', transitioning)
const globalBackground = ref('')
provide('globalBackground', globalBackground)
</script>

<style>
@property --background {
    syntax: '<color>';
    initial-value: transparent;
    inherits: false;
}
</style>