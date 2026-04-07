<template>
    <div>

        <Head>
            <Title>{{ title }}</Title>
        </Head>
        <ErrorSolver>
            <nav :class="{ open, hamburger: true }">
                <Icon
                    v-show="topNavHasChildren" name="mdi:menu" size="2rem" class="button" tabindex="0"
                    @click="open = !open" />
                <label id="eventSelect" class="p-1 text-right">
                    <span class="visible-md mr-1">
                        <Icon name="mdi:home-edit-outline" size="1.8rem" /> Vybraná akce
                    </span>
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
                <SettingsLink id="topSettingsLink" class="flex align-items-center" />
                <div id="topNav" ref="topNav" class="flex justify-content-center flex-grow" />
            </nav>
            <main @click="open = false">
                <slot />
            </main>
        </ErrorSolver>
        <div ref="navigation" class="navigation">
            <div class="flex-full">
                <ProgressBar v-if="cloud.feedback.fetching" />
                <nav v-if="cloud.feedback.fetchFailed" class="p-1">
                    {{ cloud.feedback.error || 'Nepodařilo se uložit úpravy.' }}
                </nav>
            </div>
            <div v-show="!keyboardVisible" id="additionalNav" class="flex-full" />
            <nav v-show="!keyboardVisible" role="navigation">
                <NuxtLink v-if="cloud.resolvedPermissions.editSchedule" :to="`/${cloud.selectedEvent}/admin/feedback`">
                    <span>
                        <Icon name="mdi:rss" size="1.8rem" />
                        <Icon
                            name="mdi:pencil" class="absolute" style="transform: translateX(-100%) translateY(50%);"
                            size="1.2rem" />
                    </span>
                    <span class="text">Zpětná vazba</span>
                </NuxtLink>
                <NuxtLink
                    v-if="cloud.resolvedPermissions.showApplications"
                    :to="`/${cloud.selectedEvent}/admin/people`">
                    <Icon name="mdi:tag-faces" size="1.8rem" />
                    <span class="text">Účastníci</span>
                </NuxtLink>
                <NuxtLink
                    v-if="cloud.resolvedPermissions.editEvent" :to="`/${cloud.selectedEvent}/admin/users`"
                    title="Správa registrovaných uživatelských účtů">
                    <Icon name="mdi:person-edit" size="1.8rem" />
                    <span class="text">Uživatelé</span>
                </NuxtLink>
                <NuxtLink :to="`/${cloud.selectedEvent}/schedule`">
                    <Icon name="mdi:calendar-arrow-left" size="1.8rem" />
                    <span class="text">Program</span>
                </NuxtLink>
                <NuxtLink
                    v-if="cloud.resolvedPermissions.editEvent" :to="`/${cloud.selectedEvent}/admin/events`"
                    no-prefetch>
                    <Icon name="mdi:tag-edit" size="1.8rem" />
                    <span class="text">Správa akcí</span>
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
const open = ref(false)
const topNav = useTemplateRef<HTMLDivElement>('topNav')
const topNavHasChildren = ref(false)
watch(topNav, (newTopNav, oldTopNav) => {
    if (oldTopNav) {
        // Disconnect old observer if any (though watch cleanup handles it)
    }
    if (newTopNav) {
        checkTopNav()
        if ('MutationObserver' in window) {
            const observer = new MutationObserver(() => checkTopNav())
            observer.observe(newTopNav, { childList: true })
            return () => observer.disconnect()
        } else {
            newTopNav.addEventListener('DOMSubtreeModified', checkTopNav)
            return () => newTopNav.removeEventListener('DOMSubtreeModified', checkTopNav)
        }
    }
}, { immediate: true })

function checkTopNav() {
    if (topNav.value) {
        topNavHasChildren.value = topNav.value.children.length > 0
    }
}

onBeforeRouteUpdate(() => {
    open.value = false
    checkTopNav()
})

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


    @media (max-width: 600px) {
        &>span {
            display: none;
        }
    }

    @media (max-width: 700px) {
        position: absolute;
    }
}

#eventSelect {
    margin: auto;

    @media (max-width: 700px) {
        margin: none;
        left: 50%;
        transform: translateX(-50%);
        position: absolute;

        .hamburger.open & {
            position: static;
            transform: none;
            margin: auto;
        }
    }
}
</style>