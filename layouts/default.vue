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
                <ProgressBar v-if="cloud.feedback.fetching" />
                <nav v-if="cloud.feedback.fetchFailed" class="p-1">
                    {{ cloud.feedback.error ||
                        'Nepodařilo se odeslat tvou odpověď. Ale žádný strach, je uložená offline ve tvém zařízení.' }}
                </nav>
            </div>
            <div v-show="!keyboardVisible" id="additionalNav" class="flex-full" />
            <nav v-show="!keyboardVisible" role="navigation">
                <LazyClientOnly>
                    <NuxtLink
                        v-if="config.public.featureInstallWizard && (!installComplete || $route.name?.toString().includes('install'))"
                        :to="onFeedbackPage ? `/${cloud.selectedEvent}/schedule` : `/install/0?to=/${cloud.selectedEvent}/schedule/`">
                        <Icon
                            :name="onFeedbackPage ? 'mdi:calendar-month-outline' : 'mdi:arrow-left-bold-circle-outline'"
                            size="1.8rem" />
                        {{ onFeedbackPage ? 'Zobrazit harmonogram a informace...' :
                            'K instalaci aplikace...' }}
                    </NuxtLink>
                    <MainMenu v-else />
                    <template #fallback>
                        <p class="m-auto p-3">Počkejte na načtení aplikace...</p>
                    </template>
                </LazyClientOnly>
            </nav>
            <ToastArea />
        </div>
        <ProgressBar
            v-show="isServer || ui.isLoading || cloud.eventLoading || $downloadingUpdate?.value || isPageLoading.isLoading.value"
            class="backgroundLoading" />
        <LazyClientOnly>
            <vue-easy-lightbox :visible="ui.visibleRef" :imgs="ui.imagesRef" @hide="ui.visibleRef = false" />
        </LazyClientOnly>
    </div>
</template>

<script setup lang="ts">
import { useUI } from '@/stores/ui'

const app = useNuxtApp()
const ui = useUI()
const cloud = useCloudStore()
const config = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const isServer = ref(import.meta.server)
onMounted(() => isServer.value = false)

const onFeedbackPage = computed(() => route.name?.toString().includes('feedback') ?? false)
const installComplete = useInstallComplete()
const keyboardVisible = useKeyboardVisible()
provide('keyboardVisible', keyboardVisible)
const isPageLoading = useLoadingIndicator()


watchEffect(() => {
    if (app.$needRefresh?.value || app.$pwa?.needRefresh) {
        router.push({
            path: '/update',
            query: {
                ...route.query,
                redirect: (route.path === '/update' ? route.query.redirect : null) ?? route.fullPath,
            },
        })
    }
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