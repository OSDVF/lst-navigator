<template>
    <NuxtErrorBoundary @error="captureError">

        <Head>
            <Title>{{ title }}</Title>
        </Head>
        <nav class="flex justify-content-center flex-grow">
            <label class="m-auto p-1 text-right">
                <IconCSS name="mdi:account-cog" size="1.8rem" />Vybraná akce
                <select v-model="cloudStore.selectedEvent">
                    <option v-for="event in cloudStore.eventsCollection" :key="event.id" :value="event.id">{{ event.title }}</option>
                </select>
            </label>
            <div id="topNav" class="flex" />
        </nav>
        <main>
            <slot />
        </main>
        <div class="navigation">
            <div class="flex-full">
                <ProgressBar v-if="cloudStore.feedback.fetching" />
                <nav v-if="cloudStore.feedback.fetchFailed" class="p-1">
                    {{ cloudStore.feedback.error || 'Nepodařilo se uložit úpravy.' }}
                </nav>
            </div>
            <div id="additionalNav" class="flex-full" />
            <nav role="navigation">
                <NuxtLink to="/admin/feedback">
                    <IconCSS name="mdi:rss" size="1.8rem" />
                    Zpětná vazba
                </NuxtLink>
                <NuxtLink v-if="cloudStore.resolvedPermissions.editEvent" to="/admin/events">
                    <IconCSS name="mdi:calendar-text" size="1.8rem" />
                    Akce
                </NuxtLink>
                <NuxtLink v-if="cloudStore.resolvedPermissions.superAdmin" to="/admin/users">
                    <IconCSS name="mdi:person" size="1.8rem" />
                    Uživatelé
                </NuxtLink>
                <NuxtLink to="/">
                    <IconCSS name="mdi:backburger" size="1.8rem" />
                    Program
                </NuxtLink>
                <NuxtLink to="/settings">
                    <IconCSS name="mdi:cog" size="1.8rem" />
                    Nastavení
                </NuxtLink>
            </nav>
            <div role="dialog" :class="{ networkError: true, visible: !!cloudStore.networkError }">
                <IconCSS name="mdi:cloud-off" /> Problém s připojením
            </div>
        </div>
        <ProgressBar :class="{ backgroundLoading: true, visible: cloudStore.metaLoading }" />
        <ClientOnly>
            <vue-easy-lightbox :visible="ui.visibleRef" :imgs="ui.imagesRef" @hide="ui.visibleRef = false" />
        </ClientOnly>

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

const app = useNuxtApp()
const ui = useUI()
const cloudStore = useCloudStore()
const config = useRuntimeConfig()
const route = useRoute()
const Sentry = app.$Sentry as typeof import('@sentry/vue/types')

const title = computed(() => {
    if (route.meta.title) {
        return `${route.meta.title} · Administrace ${config.public.title}`
    }
    return config.public.title
})

function captureError(error: unknown) {
    // eslint-disable-next-line no-console
    console.error(error, error instanceof TypeError ? error.stack : null)
    Sentry.captureException(error)
}

</script>
