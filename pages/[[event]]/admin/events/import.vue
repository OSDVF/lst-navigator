<template>
    <ImportForm
        v-if="cloud.resolvedPermissions.superAdmin" ref="form" :truncate-option="importInto"
        :embedded="false" @import="importJson" @error="ui.showError">
        <template #legend>
            <h3>{{ importText }}</h3>
        </template>
        <template #settings>
            <div>
                <input id="shiftDateEnabled" v-model="shiftDateEnabled" type="checkbox">
                <label for="shiftDateEnabled">Posunout datum akce</label><br>
                <template v-if="shiftDateEnabled">
                    <input id="shiftDate" v-model="shiftDate" type="date">&nbsp;
                    <DateFormat />
                </template>
            </div>
        </template>
        {{ importText }}
        <CustomError />
    </ImportForm>
    <div v-else>
        Nedostatečná oprávnění
    </div>
</template>

<script setup lang="ts">
import { doc, type DocumentData } from 'firebase/firestore'
import pickBy from 'lodash.pickby'
import { EventSubcollectionsList, type EventDescription, type ScheduleDay } from '~/types/cloud'
import { setDoc as setDocT } from '~/utils/trace'

definePageMeta({
    title: 'Import akce',
    layout: 'admin',
    middleware: ['auth'],
})

const selectedEvent = useSelectedEvent(undefined, undefined, true)
const importInto = computed(() => !!selectedEvent.value)
const importText = computed(() => importInto.value ? 'Importovat do ' + (cloud.eventDescription?.title ?? '...') : 'Importovat jako novou akci')
const shiftDateEnabled = ref(false)
const shiftDate = ref<string>()

const cloud = useCloudStore()
const lang = useLang()
const fs = useFirestore()
const ui = useUI()

async function importJson(source: Record<string, EventDescription<DocumentData>>, merge: boolean) {
    //TODO create dummy schedule
    if (fs) {
        for (const importingEventId in source) {// there can be multiple events to import
            const data = source[importingEventId as keyof typeof source]
            if (typeof data !== 'object') {
                alert('Neplatný formát')
                return
            }
            if (importInto.value && !selectedEvent.value) {
                if (!confirm('Nebyla nalezena vybraná událost. Importovat jako novou?')) {
                    return
                }
            }
            let docs = eventDocs(fs, importInto.value ? (selectedEvent.value ?? importingEventId) : importingEventId)
            if (!selectedEvent.value) {
                if ((await getDocCacheOr(docs.event)).exists()) {
                    const response = prompt('Událost s ID ' + importingEventId + ' již existuje. Chcete data ' + (merge ? 'sloučit' : 'přepsat') + '? Pokud ne, zadejte nové ID importované události.', importingEventId)
                    if (!response) {
                        alert('Import zrušen.')
                        return
                    }
                    docs = eventDocs(fs, response)
                }
            }
            // Event props
            const eventMetaProps = pickBy(data, (_, docKey) => !EventSubcollectionsList.includes(docKey as any)) as EventDescription
            if (shiftDateEnabled.value && shiftDate.value) {
                const start = toJSDate(eventMetaProps.start).getTime()
                const end = toJSDate(eventMetaProps.end).getTime()
                const duration = end - start
                const durationDays = duration / oneDay
                const shiftDateJS = new Date(shiftDate.value)
                const shiftStartMilis = shiftDateJS.getTime()
                eventMetaProps.start = toFirebaseDate(shiftDateJS)
                eventMetaProps.end = toFirebaseDate(new Date(shiftStartMilis + duration))

                const sortedDays = Object.values(data.schedule as Record<string, ScheduleDay & { id: string }>).toSorted((a, b) => toJSDate(a.date).getTime() - toJSDate(b.date).getTime())
                data.schedule = {}
                let thisDay = shiftStartMilis
                for (let i = 0; i <= durationDays; i++, thisDay += oneDay) {
                    const thisDate = new Date(thisDay)
                    if (!sortedDays[i]) {
                        sortedDays[i] = {} as any
                    }
                    const id = toFirebaseMonthDay(thisDate)
                    sortedDays[i]!.id = id
                    sortedDays[i]!.date = toFirebaseDate(thisDate)
                    sortedDays[i]!.name = dayName(thisDate, lang.value)
                    data.schedule[id] = sortedDays[i]
                }
            }
            setDocT(docs.event, eventMetaProps, { merge })
            // Subdocuments
            for (const sub of EventSubcollectionsList) {
                if (data[sub as keyof typeof data]) {
                    for (const subKey in (data as any)[sub]) {// every document in the subcollection
                        const content = (data as any)[sub][subKey]
                        const id = content.id
                        delete content.id
                        setDocT(doc(docs[sub], id), content, { merge })
                    }
                }
            }
        }
    }
}

</script>
