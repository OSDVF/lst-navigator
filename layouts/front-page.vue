<template>
    <div style="transition: opacity .2s, transform .2s;">

        <Head>
            <Title>{{ title }}</Title>
        </Head>
        <ErrorSolver>
            <main>
                <slot />
                <p v-if="!['front-page', 'event-preview'].includes($route.name?.toString() ?? '')" class="article">
                    <NuxtLink to="/" replace>
                        <Icon name="mdi:apps" />
                        <Icon name="mdi:arrow-left" /> Zpět na seznam událostí
                    </NuxtLink>
                </p>
            </main>
        </ErrorSolver>
        <ProgressBar
            v-show="isServer || ui.isLoading || cloud.eventLoading || $downloadingUpdate?.value"
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

watchEffect(() => {
    if (app.$needRefresh?.value) {
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
</script>

<style>
@property --background {
    syntax: '<color>';
    initial-value: transparent;
    inherits: false;
}
</style>