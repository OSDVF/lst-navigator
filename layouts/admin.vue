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
                <div id="topNav" class="flex">
                    <SettingsLink id="topSettingsLink" class="flex align-items-center visible-if-only absolute" />
                </div>
            </nav>
            <main>
                <slot />
            </main>
        </ErrorSolver>
        <div class="navigation" ref="navigation">
            <div class="flex-full">
                <ProgressBar v-if="cloud.feedback.fetching" />
                <nav v-if="cloud.feedback.fetchFailed" class="p-1">
                    {{ cloud.feedback.error || 'Nepodařilo se uložit úpravy.' }}
                </nav>
            </div>
            <div v-show="!keyboardVisible" id="additionalNav" class="flex-full" />
            <nav v-show="!keyboardVisible" role="navigation">
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
                    v-if="cloud.resolvedPermissions.showApplications"
                    :to="`/${cloud.selectedEvent}/admin/people`">
                    <Icon name="mdi:tag-faces" size="1.8rem" />
                    Účastníci
                </NuxtLink>
                <NuxtLink
                    v-if="cloud.resolvedPermissions.editEvent" :to="`/${cloud.selectedEvent}/admin/users`"
                    title="Správa registrovaných uživatelských účtů">
                    <Icon name="mdi:person-edit" size="1.8rem" />
                    Uživatelé
                </NuxtLink>
                <NuxtLink :to="`/${cloud.selectedEvent}/schedule`">
                    <Icon name="mdi:calendar-arrow-left" size="1.8rem" />
                    Program
                </NuxtLink>
                <NuxtLink
                    v-if="cloud.resolvedPermissions.editEvent" :to="`/${cloud.selectedEvent}/admin/events`"
                    no-prefetch>
                    <Icon name="mdi:tag-edit" size="1.8rem" />
                    Správa akcí
                </NuxtLink>
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
const { $config, $downloadingUpdate } = useNuxtApp()
const route = useRoute()
const gapi = useGapi()

const keyboardVisible = useKeyboardVisible()
provide('keyboardVisible', keyboardVisible)
const navigation = useTemplateRef<HTMLDivElement>('navigation')
provide('navigation', navigation)

const title = computed(() => {
    if (route.meta.title) {
        return `${route.meta.title} · Administrace ${$config.public.title}`
    }
    return $config.public.title
})

</script>

<style lang="scss">
#topSettingsLink {
    gap: 5px;
    right: 10px;
    top: 7px;

    @media (max-width: 450px) {
        display: none;
    }

    @media (max-width: 650px) {
        &>span {
            display: none;
        }
    }
}
</style>