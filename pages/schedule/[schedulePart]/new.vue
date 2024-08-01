<template>
    <div>
        <details>
            <summary>Kopírovat z předchozích</summary>
            <div class="flex flex-wrap">
                <button
                    v-for="(event, index) in cloud.suggestions" :key="`e${index}`" type="button"
                    :style="`background:${event.color};max-width:33%;overflow:hidden`" @click="useSuggested(event)">
                    <h3>{{ event.title }}</h3>
                    {{ event.subtitle }}
                    {{ toHumanTime(event.time) }}
                    <br>
                    <IconCSS v-if="event.feedbackType" name="mdi:rss" /> {{ toHumanFeedback(event.feedbackType) }}
                    {{ event.description?.substring(0, 20) }} {{ (event.description?.length ?? 0) > 20 ? '...' : '' }}
                </button>
            </div>
        </details>

        <fieldset>
            <legend>Nový program</legend>
            <NewProgram v-model="newEvent"/>
        </fieldset>
    </div>
</template>

<script setup lang="ts">
import type { ScheduleEvent } from '@/types/cloud'
import { useCloudStore } from '@/stores/cloud'
import { toHumanFeedback, toHumanTime } from '@/utils/types'

const newEvent = ref<ScheduleEvent>({
    color: '',
    description: '',
    questions: [],
    subtitle: '',
    title: '',
})

const cloud = useCloudStore()
function useSuggested(event: ScheduleEvent) {
    confirm('Opravdu chcete použít tento program? Současné údaje budou přepsány.') && (newEvent.value = event)
}
</script>