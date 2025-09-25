<template>
    <div>
        <Head>
            <Title>{{ title }}</Title>
        </Head>
        <ErrorSolver>
            <nav class="flex justify-content-center flex-grow">
                <label class="m-auto p-1 text-right">
                    <Icon name="mdi:home-edit-outline" size="1.8rem" /> Vybraná akce
                    <select v-model="cloudStore.selectedEvent">
                        <option v-for="event in cloudStore.eventsCollection" :key="event.id" :value="event.id">{{
                            event.title }}</option>
                    </select>
                </label>
                <div id="topNav" class="flex" />
            </nav>
            <main>
                <slot />
            </main>
        </ErrorSolver>
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
                    <Icon name="mdi:rss" size="1.8rem" />
                    Zpětná vazba
                </NuxtLink>
                <NuxtLink v-if="cloudStore.resolvedPermissions.editEvent" to="/admin/events" no-prefetch>
                    <Icon name="mdi:calendar-month" size="1.8rem" />
                    Akce
                </NuxtLink>
                <NuxtLink v-if="cloudStore.resolvedPermissions.editEvent" to="/admin/users">
                    <Icon name="mdi:person" size="1.8rem" />
                    Uživatelé
                </NuxtLink>
                <NuxtLink to="/">
                    <Icon name="mdi:calendar-arrow-left" size="1.8rem" />
                    Program
                </NuxtLink>
                <SettingsLink />
            </nav>
            <ToastArea />
        </div>
        <ProgressBar v-show="cloudStore.eventLoading || $downloadingUpdate?.value || ui.isLoading" class="backgroundLoading" />
        <LazyClientOnly>
            <vue-easy-lightbox :visible="ui.visibleRef" :imgs="ui.imagesRef" @hide="ui.visibleRef = false" />
        </LazyClientOnly>
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
        return `${route.meta.title} · Administrace ${config.public.title}`
    }
    return config.public.title
})

</script>
