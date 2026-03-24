<template>
    <div
        class="card a p" tabindex="0"
        @click="e => ['A', 'SPAN'].includes((e.target as HTMLElement).tagName) ? e.stopPropagation() : link.navigate()">
        <EventImage ref="image" class="noinvert" :event="event.id" @load="imageLoaded = true" />
        <nav class="flex-wrap" :style="{ position: (event.image?.data && imageLoaded) ? 'absolute' : undefined }">
            <div class="flex-full" style="height: 5rem;" />
            <div class="ml-3 mr-2 flex-full">
                <h2>{{ event.title }}</h2>
                <h3>{{ event.subtitle }}</h3>
            </div>
            <NuxtLink v-if="event.a" :to="`/${event.id}/apply`">
                <Icon name="mdi:form-select" size="1.8rem" />&ensp;Přihláška
            </NuxtLink>
            <NuxtLink :to="`/${event.id}/schedule`">
                <Icon name="mdi:calendar" size="1.8rem" />
                <Icon v-if="event.f" name="mdi:rss" size="1.8rem" />&ensp; Program<template v-if="event.f"> a
                    feedback</template>
            </NuxtLink>
        </nav>
    </div>
</template>

<script setup lang="ts">
import type { EventDescription } from '~/types/cloud'
import type EventImage from './EventImage.vue'
import type { NavigationFailure } from '#vue-router'

defineProps<{
    event: EventDescription<void> & { id: string, a: boolean, f: boolean },
    link: {
        // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
        navigate: (e?: MouseEvent) => Promise<void |NavigationFailure>
    }
}>()

const imageLoaded = ref(false)

</script>