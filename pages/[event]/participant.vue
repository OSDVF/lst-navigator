<template>
    <ProgressBar v-if='cloud.eventLoading' />

    <div v-else-if="cloud.participantSectionVisible">
        <NuxtPage :name="$route.params.subpage as string" />
        <LazyClientOnly>
            <Teleport
                v-if="((cloud.eventDescription?.formDocument ? 1 : 0) + (!!cloud.groups.length ? 1 : 0) + (!!cloud.duties.length ? 1 : 0)) > 1"
                to="#additionalNav">
                <nav class="eventItemNav">
                    <NuxtLink
                        v-if="cloud.eventDescription?.formDocument"
                        :to="`/${cloud.selectedEvent}/participant/application`">
                        <Icon name="mdi:vote-outline" />
                        Přihláška
                    </NuxtLink>
                    <NuxtLink v-if="cloud.groups.length" :to="`/${cloud.selectedEvent}/participant/groups`">
                        <Icon name="mdi:group" />
                        Skupinky
                    </NuxtLink>
                    <NuxtLink v-if="cloud.duties.length" :to="`/${cloud.selectedEvent}/participant/duties`">
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
    title: 'Účastník',
})
onMounted(() => {
    const route = useRoute()
    const parts = route.name?.toString().split('-')
    if (cloud.participantSectionVisible && parts?.length == 2 && parts[1] == 'participant') {
        return navigateTo(path.join(route.path, cloud.eventDescription?.formDocument ? 'application' : cloud.groups.length ? 'groups' : 'duties'), {
            replace: true,
        })
    }
})
const cloud = useCloudStore()
</script>