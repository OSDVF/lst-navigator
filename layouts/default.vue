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
            <div class="flex-full">
                <ProgressBar v-if="cloudStore.feedback.fetching" />
                <nav v-if="cloudStore.feedback.fetchFailed" class="p-1">
                    {{ cloudStore.feedback.error || 'Nepodařilo se odeslat tvou odpověď. Ale žádný strach, je uložená offline ve tvém zařízení.' }}
                </nav>
            </div>
            <div id="additionalNav" class="flex-full" />
            <nav role="navigation">
                <NuxtLink to="/info">
                    <Icon name="mdi:information" size="1.8rem" />
                    {{ config.public.title }}
                </NuxtLink>
                <NuxtLink to="/schedule">
                    <Icon name="mdi:calendar-text" size="1.8rem" />
                    Program
                </NuxtLink>
                <NuxtLink v-if="cloudStore.resolvedPermissions.editSchedule" to="/admin">
                    <Icon name="mdi:account-cog" size="1.8rem" />
                    Administrace
                </NuxtLink>
                <SettingsLink />
            </nav>
            <div role="dialog" :class="{ networkError: true, visible: !!cloudStore.networkError }">
                <Icon name="mdi:cloud-off" /> Problém s připojením
            </div>
        </div>
        <ProgressBar v-show="isServer || cloudStore.eventLoading" class="backgroundLoading" />
        <LazyClientOnly>
            <vue-easy-lightbox :visible="ui.visibleRef" :imgs="ui.imagesRef" @hide="ui.visibleRef = false" />
        </LazyClientOnly>

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
                    <p>
                        Pokud chyba přetrvává, zkuste
                        <AppManageBtns />
                    </p>
                </article>
            </main>

        </template>
    </NuxtErrorBoundary>
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
const installStep = settings.installStep
const isServer = ref(import.meta.server)

onMounted(() => {
    isServer.value = false
    ///
    /// Redirection guards
    ///
    const safeStep = toRaw(installStep)
    if (!(route.name as string)?.includes('feedback') && safeStep < config.public.installStepCount) {
        router.push('/install/' + safeStep)
    }
    const redirectRoute : RouteLocationRaw = {
        path: '/update',
        query: {
            redirect: (route.path === '/update' ? route.query.redirect : null) ?? route.fullPath,
        },
    }
    if (app.$pwa?.needRefresh) {
        router.push(redirectRoute)
    }

    app.$onUpdateCallback(() => {
        router.push(redirectRoute)
    })
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
    try {
        console.error(error, error instanceof TypeError ? error.stack : null)
        app.$Sentry.captureException(error)
    } catch (e) { console.error(e) }
}

</script>
