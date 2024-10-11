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
            <form ref="form" @submit.prevent="editProgram">
                <EditProgram :value="editedEvent" />
                <button type="submit" class="mt-1 large">
                    <Icon :name="editing ? 'mdi:pencil' : 'mdi:plus-circle'" />
                    {{ editing ? 'Upravit' : 'Přidat' }}
                </button>
                <template v-if="!editing">
                    <input id="autoOrder" v-model="autoOrder" type="checkbox"> <label
                        title="Jinak se program přidá na konec" for="autoOrder">Automaticky
                        vpasovat do harmonogramu</label>
                </template>
            </form>
        </fieldset>
    </div>
</template>

<script setup lang="ts">
import type { ScheduleItem, ScheduleDay } from '@/types/cloud'
import { knownCollection, useCloudStore } from '@/stores/cloud'
import { toHumanFeedback, toHumanTime, parseIntOrNull } from '@/utils/types'
import { setDoc } from '~/utils/trace'
import { doc, arrayUnion } from 'firebase/firestore'
import type { VueFirestoreDocumentData } from 'vuefire'
import { useAdmin } from '~/stores/admin'

const router = useRouter()
const route = router.currentRoute
const selectedDayIndex = computed(() => typeof route.value.params.day === 'string' ? parseInt(route.value.params.day) : 0)
const selectedDayId = computed(() => cloud.days[selectedDayIndex.value].id)
const selectedEditIndex = computed(() => {
    if (route.value.params.edit) {
        const parsed = parseInt(route.value.params.edit as string)
        if (!isNaN(parsed)) {
            return parsed
        }
    }
    return undefined
})
const program = computed(() => cloud.days[selectedDayIndex.value].program)
const editing = computed(() => typeof selectedEditIndex.value !== 'undefined')
const autoOrder = usePersistentRef('autoOrder', false)

const cloud = useCloudStore()
const editedEvent = ref<ScheduleItem>({
    color: '',
    description: '',
    questions: [],
    subtitle: '',
    title: '',
})
const dirty = ref(false)
watch(editedEvent, () => dirty.value = true, { deep: true })
const warning = 'Opravdu chcete opustit tuto stránku? Neuložené změny budou ztraceny.'

function beforeunload() {
    if (dirty.value) {
        return warning
    }
}

const admin = useAdmin()
const form = ref()
onMounted(() => {
    if (route.value.params.edit == 'paste') {
        Object.assign(editedEvent.value, toRaw({ ...admin.eventClipboard }))
    } else if (route.value.params.edit == 'pastenow') {
        Object.assign(editedEvent.value, toRaw({ ...admin.eventClipboard }))
        nextTick(() => editProgram({ target: form.value } as any))
    }
    else if (editing.value) {
        Object.assign(editedEvent.value, toRaw({ ...program.value[selectedEditIndex.value!] }))
    }
    window.addEventListener('beforeunload', beforeunload)
})

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', beforeunload)
})

onBeforeRouteLeave(() => {
    if (dirty.value) {
        return confirm(warning)
    }
})

const fs = useFirestore()
const union = ref(false)

function useSuggested(event: ScheduleItem) {
    confirm('Opravdu chcete použít tento program? Současné údaje budou přepsány.') && (Object.assign(editedEvent.value, event))
}
async function copyDay(part: NonNullable<VueFirestoreDocumentData<ScheduleDay>>) {
    if (confirm('Opravdu chcete načíst tento den? ' + (union.value ? 'Existující program dne bude zachován.' : 'Úplně celý program dne bude přepsán.'))) {
        await setDoc(
            cloud.eventDoc('schedule', selectedDayId.value), {
                program: union.value ? arrayUnion(...part.program) : part.program,
            } as ScheduleDay, { merge: true },
        )
        router.push('/schedule/' + selectedDayIndex.value)
    }
}

const config = useRuntimeConfig()
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
    } as ScheduleItem

    let autoOrderIndex = 0
    for (const event of program.value) {
        if (event.time && event.time < parsedData.time!) {
            autoOrderIndex++
        } else {
            break
        }
    }

    await setDoc(cloud.eventDoc('schedule', selectedDayId.value), {
        program: editing.value ? [// Replace at selectedEditIndex
            ...program.value.slice(0, selectedEditIndex.value!),
            parsedData,
            ...program.value.slice(selectedEditIndex.value! + 1),
        ] : autoOrder.value ? [// Insert at autoOrderIndex
            ...program.value.slice(0, autoOrderIndex),
            parsedData,
            ...program.value.slice(autoOrderIndex),
        ] : arrayUnion(parsedData),// Append
    }, { merge: true })

    dirty.value = false // Reset dirty state
    router.push('/schedule/' + selectedDayIndex.value)

    const last = (cloud.lastSuggestion + 1) % parseInt(config.public.maxSuggestions)
    await setDoc(
        doc(knownCollection(fs, 'suggestions'),
            (last).toString()),
        parsedData,
    )

    await setDoc(
        doc(knownCollection(fs, 'suggestions'), 'last'), { last }, { merge: true },
    )
}

function emptyToNull(value?: any) {
    if (!value) {
        return null
    }
    return value
}
</script>