<template>
    <div>
        <details class="border">
            <summary>
                <IconCSS name="mdi:ab-testing" />&ensp; Kopírovat z předchozích
            </summary>
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
        <br>
        <details class="border">
            <summary>
                <IconCSS name="mdi:content-copy" />&ensp; Kopírovat celý den
            </summary>
            <label>
                <input v-model="union" type="checkbox" name="union" > Přidat k již existujícímu programu dne
            </label>
            <div class="flex flex-wrap pt-1">
                <template v-for="part in cloud.days" :key="part.id">
                    <button v-if="part.program" type="button" @click="copyDay(part)">
                        <h3>{{ part.name }}</h3>
                        {{ part.date }}
                        <br>
                        {{ part.manager }}
                    </button>
                </template>
            </div>
        </details>
        <br>
        <fieldset>
            <legend>
                <IconCSS name="mdi:timeline" />&ensp; Nový program
            </legend>
            <NewProgram v-model="newEvent" :day="selectedDay" />
        </fieldset>
    </div>
</template>

<script setup lang="ts">
import type { ScheduleEvent, ScheduleDay } from '@/types/cloud'
import { knownCollection, useCloudStore } from '@/stores/cloud'
import { toHumanFeedback, toHumanTime } from '@/utils/types'
import { setDoc } from '~/utils/trace'
import { doc, arrayUnion } from 'firebase/firestore'
import type { VueFirestoreDocumentData } from 'vuefire'

const newEvent = ref<ScheduleEvent>({
    color: '',
    description: '',
    questions: [],
    subtitle: '',
    title: '',
})

const route = useRoute()
const selectedDay = computed(() => typeof route.params.day === 'string' ? parseInt(route.params.day) : 0)

const cloud = useCloudStore()
const fs = useFirestore()
const union = ref(false)

function useSuggested(event: ScheduleEvent) {
    confirm('Opravdu chcete použít tento program? Současné údaje budou přepsány.') && (Object.assign(newEvent.value, event))
}
function copyDay(part: NonNullable<VueFirestoreDocumentData<ScheduleDay>>) {
    confirm('Opravdu chcete načíst tento den? ' + (union.value ? 'Existující program dne bude zachován.' : 'Úplně celý den bude přepsán.')) && (setDoc(doc(knownCollection(fs, 'events'), cloud.selectedEvent, 'schedule', part.id), {
        date: part.date,
        name: part.name,
        manager: part.manager,
        program: union.value ? arrayUnion(...part.program) : part.program,
    } as ScheduleDay), { merge: true })
}
</script>