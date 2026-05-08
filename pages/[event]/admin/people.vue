<template>
    <ProgressBar v-if='cloud.eventLoading' />

    <div v-else-if="cloud.resolvedPermissions.showApplications">
        <NuxtPage />
        <LazyClientOnly>
            <Teleport v-if="mounted" to="#additionalNav">
                <nav class="eventItemNav">
                    <template v-if="cloud.eventDescription?.formDocument || cloud.eventDescription?.participantSection || applications.applications.length  || cloud.groups.length || cloud.duties.length">
                        <NuxtLink :to="`/${cloud.selectedEvent}/admin/people/applications`">
                            <Icon name="mdi:vote-outline" />
                            Přihlášky
                        </NuxtLink>
                        <NuxtLink :to="`/${cloud.selectedEvent}/admin/people/statistics`">
                            <Icon name="mdi:information-slab-circle-outline" />
                            Statistiky
                        </NuxtLink>
                    </template>
                    <NuxtLink :to="`/${cloud.selectedEvent}/admin/people/groups`">
                        <Icon name="mdi:group" />
                        Skupinky
                    </NuxtLink>
                    <NuxtLink :to="`/${cloud.selectedEvent}/admin/people/duties`">
                        <Icon name="mdi:dishwasher" />
                        Služby
                    </NuxtLink>
                </nav>
            </Teleport>
        </LazyClientOnly>
    </div>
    <article v-else>
        Nemáte práva na zobrazení této stránky.
    </article>
</template>

<script setup lang="ts">
import path from 'path'

definePageMeta({
    title: 'Účastníci',
    layout: 'admin',
    middleware: ['auth', (to, from) => {
        const parts = to.name?.toString().split('-')
        if (parts?.length == 3 && parts[2] == 'people') {
            if(to.fullPath == from.fullPath) {
                return location.replace(path.join(to.path, 'applications'))
            }
            return navigateTo(path.join(to.path, 'applications'), {
                replace: true,
            })
        }
    }],
})

const cloud = useCloudStore()
const applications = useApplications()
const mounted = ref(false)
onMounted(() => mounted.value = true)
</script>