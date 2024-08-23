<template>
    <div class="pl-1 pr-1">
        <h2>{{
            editing ? `Upravit program #${selectedDayIndex}#${selectedEditIndex}` : 'Nový program'
        }}</h2>
        <details class="border">
            <summary>
                <Icon name="mdi:ab-testing" />&ensp; Kopírovat z předchozích
            </summary>
            <div class="flex flex-wrap">
                <button
                    v-for="(event, index) in cloud.suggestions" :key="`e${index}`" type="button"
                    :style="`background:${event.color};max-width:33%;overflow:hidden`" @click="useSuggested(event)">
                    <h3>{{ event.title }}</h3>
                    {{ event.subtitle }}
                    {{ toHumanTime(event.time) }}
                    <br>
                    <Icon v-if="event.feedbackType" name="mdi:rss" /> {{ toHumanFeedback(event.feedbackType) }}
                    {{ event.description?.substring(0, 20) }} {{ (event.description?.length ?? 0) > 20 ? '...' : '' }}
                </button>
            </div>
        </details>
        <br>
        <details class="border">
            <summary>
                <Icon name="mdi:content-copy" />&ensp; Kopírovat celý den
            </summary>
            <label>
                <input v-model="union" type="checkbox" name="union"> Přidat k již existujícímu programu dne
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
                <Icon name="mdi:timeline" />&ensp; Nový program
            </legend>
            <form @submit.prevent="editProgram">
                <EditProgram :value="editedEvent" />
                <button type="submit" class="mt-1">
                    <Icon :name="editing ? 'mdi:pencil' : 'mdi:plus-circle'" />
                    {{ editing ? 'Upravit' : 'Přidat' }}
                </button>
            </form>
        </fieldset>
    </div>
</template>

<script setup lang="ts">
import type { ScheduleEvent, ScheduleDay } from '@/types/cloud'
import { knownCollection, useCloudStore } from '@/stores/cloud'
import { toHumanFeedback, toHumanTime, parseIntOrNull } from '@/utils/types'
import { setDoc } from '~/utils/trace'
import { doc, arrayUnion } from 'firebase/firestore'
import type { VueFirestoreDocumentData } from 'vuefire'

const router = useRouter()
const route = router.currentRoute
const selectedDayIndex = computed(() => typeof route.value.params.day === 'string' ? parseInt(route.value.params.day) : 0)
const selectedEditIndex = computed(() => route.value.params.edit ? parseInt(route.value.params.edit as string) : undefined)
const program = computed(() => cloud.days[selectedDayIndex.value].program)
const editing = computed(() => typeof selectedEditIndex.value !== 'undefined')

const cloud = useCloudStore()
const editedEvent = ref<ScheduleEvent>({
    color: '',
    description: '',
    questions: [],
    subtitle: '',
    title: '',
})
onMounted(() => {
    if (editing.value) {
        Object.assign(editedEvent.value, { ...program.value[selectedEditIndex.value!] })
    }
})

const fs = useFirestore()
const union = ref(false)

function useSuggested(event: ScheduleEvent) {
    confirm('Opravdu chcete použít tento program? Současné údaje budou přepsány.') && (Object.assign(editedEvent.value, event))
}
function copyDay(part: NonNullable<VueFirestoreDocumentData<ScheduleDay>>) {
    confirm('Opravdu chcete načíst tento den? ' + (union.value ? 'Existující program dne bude zachován.' : 'Úplně celý den bude přepsán.')) && (setDoc(doc(knownCollection(fs, 'events'), cloud.selectedEvent, 'schedule', part.id), {
        date: part.date,
        name: part.name,
        manager: part.manager,
        program: union.value ? arrayUnion(...part.program) : part.program,
    } as ScheduleDay), { merge: true })
}

async function editProgram(event: Event) {
    const data = new FormData(event.target as HTMLFormElement)
    const parsedData = {
        color: emptyToNull(data.get('color')),
        detailQuestion: emptyToNull(data.get('detailQuestion')),
        description: emptyToNull(data.get('description')),
        feedbackType: emptyToNull(data.get('feedbackType')),
        icon: emptyToNull(data.get('icon')),
        questions: data.getAll('questions[]'),
        subtitle: data.get('subtitle'),
        time: parseIntOrNull(data.get('time')?.toString()),
        title: data.get('title'),
    } as ScheduleEvent;

    await setDoc(cloud.eventDoc('schedule', cloud.days[selectedDayIndex.value].id), {
        program: editing.value ? [
            ...program.value.slice(0, selectedEditIndex.value!),
            parsedData,
            ...program.value.slice(selectedEditIndex.value! + 1),
        ] : arrayUnion(parsedData),
    }, { merge: true })

    router.push('/schedule/' + selectedDayIndex.value)
}

function emptyToNull(value?: any) {
    if (!value) {
        return null
    }
    return value
}
</script>