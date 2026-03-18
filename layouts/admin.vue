<template>
    <div>

        <Head>
            <Title>{{ title }}</Title>
        </Head>
        <ErrorSolver>
            <nav class="flex justify-content-center flex-grow">
                <label class="m-auto p-1 text-right">
                    <Icon name="mdi:home-edit-outline" size="1.8rem" /> Vybraná akce
                    <select
                        :value="cloud.eventDescription?.id ?? $config.public.defaultEvent" @change="e => $router.push({
                            name: $route.name,
                            path: $route.path,
                            query: $route.query,
                            params: {
                                ...$route.params,
                                event: (e.target as HTMLSelectElement).value
                            }
                        } as RouteLocationRaw)">
                        <option v-for="event in cloud.eventsCollection" :key="event.id" :value="event.id">{{
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
                <ProgressBar v-if="cloud.feedback.fetching" />
                <nav v-if="cloud.feedback.fetchFailed" class="p-1">
                    {{ cloud.feedback.error || 'Nepodařilo se uložit úpravy.' }}
                </nav>
            </div>
            <div id="additionalNav" class="flex-full" />
            <nav role="navigation">
                <NuxtLink :to="`/${cloud.selectedEvent}/admin/feedback`">
                    <span>
                        <Icon name="mdi:rss" size="1.8rem" />
                        <Icon
                            name="mdi:pencil" class="absolute" style="transform: translateX(-100%) translateY(50%);"
                            size="1.2rem" />
                    </span>
                    Zpětná vazba
                </NuxtLink>
                <NuxtLink
                    v-if="cloud.resolvedPermissions.editEvent" :to="`/${cloud.selectedEvent}/admin/events`"
                    no-prefetch>
                    <Icon name="mdi:tag-edit" size="1.8rem" />
                    Akce
                </NuxtLink>
                <NuxtLink v-if="cloud.resolvedPermissions.editEvent" :to="`/${cloud.selectedEvent}/admin/users`">
                    <Icon name="mdi:person-edit" size="1.8rem" />
                    Uživatelé
                </NuxtLink>
                <NuxtLink :to="`/${cloud.selectedEvent}/schedule`">
                    <Icon name="mdi:calendar-arrow-left" size="1.8rem" />
                    Program
                </NuxtLink>
                <SettingsLink />
            </nav>
            <ToastArea />
        </div>
        <ProgressBar
            v-show="cloud.eventLoading || $downloadingUpdate || ui.isLoading || gapi.loading"
            class="backgroundLoading" />
        <LazyClientOnly>
            <vue-easy-lightbox :visible="ui.visibleRef" :imgs="ui.imagesRef" @hide="ui.visibleRef = false" />
        </LazyClientOnly>
    </div>
</template>

<script setup lang="ts">
import { useUI } from '@/stores/ui'
import type { RouteLocationRaw } from 'vue-router'

const ui = useUI()
const cloud = useCloudStore()
const {$config, $downloadingUpdate} = useNuxtApp()
const route = useRoute()
const gapi = useGapi()

const title = computed(() => {
    if (route.meta.title) {
        return `${route.meta.title} · Administrace ${$config.public.title}`
    }
    return $config.public.title
})

</script>
