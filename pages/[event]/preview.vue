<template>
    <article>
        <EventInfo />

        <nav v-if="cloud.eventDescription.value" style="position: fixed;left:0;right:0;bottom:0;" class="navigation">
            <NuxtLink v-if="cloud.visibleEvents.value.length > 1 || cloud.visibleEvents.value[0]?.id != cloud.selectedEvent.value" to="/">
                <Icon name="mdi:apps" size="2rem" />
                <Icon name="mdi:arrow-left" />&ensp;Události
            </NuxtLink>
            <NuxtLink
                v-if="applicationsEnabled(cloud.eventDescription.value)"
                :to="`/${cloud.eventDescription.value.id}/apply`">
                <Icon name="mdi:form-select" size="2rem" />&ensp;Přihláška
            </NuxtLink>
            <NuxtLink :to="`/${cloud.eventDescription.value.id}/schedule`">
                <Icon name="mdi:calendar" size="2rem" /><Icon v-if="feedbackEnabled(cloud.eventDescription.value)" name="mdi:rss" size="1.8rem" />&ensp; Program <template v-if="feedbackEnabled(cloud.eventDescription.value)"> &
                    feedback</template>
            </NuxtLink>
        </nav>
    </article>
</template>

<script setup lang="ts">
definePageMeta({
    title: 'Informace',
    layout: 'front-page',
    pageTransition: {// TODO transitions don't work
        name: 'slide-left',
    },
})

const cloud = storeToRefs(useCloudStore())
watchEffect(() => {
    setTitle('Informace - ' + cloud.eventDescription.value?.title)
})//TODO reactive title does not work
</script>
