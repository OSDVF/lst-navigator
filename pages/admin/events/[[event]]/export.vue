<template>
    <article>
        <h1>Exportovat událost</h1>
        <h2>{{ event?.title }}</h2>
        <form @submit.prevent="exportEvent">
            <input id="meta" v-model="selected.meta" type="checkbox" name="meta">
            <label for="meta">Detaily události</label><br>
            <input id="program" v-model="selected.schedule" type="checkbox" name="program">
            <label for="program">Program</label><br>
            <input id="feedbackConfig" v-model="selected.feedbackConfig" type="checkbox" name="feedbackConfig">
            <label for="feedbackConfig">Feedbackový formulář</label><br>
            <input id="feedback" v-model="selected.feedback" type="checkbox" name="feedback"><label for="feedback">
                Feedback
                účastníků</label><br>
            <input id="notes" v-model="selected.notes" type="checkbox" name="notes"><label for="notes">
                Poznámky
                účastníků</label><br>
            <br>
            <button :disabled="!anySelected" type="submit">
                <Icon name="mdi:export" /> Export
            </button>
            <p v-if="!anySelected" class="muted">Vyberte alespoň jednu možnost</p>
        </form>
    </article>
</template>
<script setup lang="ts">
import { collection, doc } from 'firebase/firestore'
import { getDocCacheOr } from '~/utils/trace'
import pickBy from 'lodash.pickby'
import { EventSubcollectionsList, type EventSubcollection } from '~/types/cloud'

definePageMeta({
    layout: 'admin',
})

const cloud = useCloudStore()
const route = useRoute()
const selectedEvent = route.params.event
const event = cloud.eventsCollection.find(e => e.id == selectedEvent)
const fs = useFirestore()

const selected: Ref<{
    [key in EventSubcollection]?: boolean } & { meta: boolean }> = ref({
        feedback: true,
        feedbackConfig: true,
        meta: false,
        notes: true,
        schedule: true,
    })

const anySelected = computed(() => Object.values(selected.value).reduce((a, b) => a || b, false))

async function exportEvent() {
    if (event) {
        const subdocs: { [key in EventSubcollection]?: any } = {}
        for (const sub of EventSubcollectionsList) {
            if (!selected.value[sub]) {
                continue
            }

            const subcol = await useCollection(collection(fs, 'events', event.id, sub), { once: true, wait: true }).promise.value

            if (subcol) {
                subdocs[sub] ??= {}
            }
            for (const doc of subcol) {
                subdocs[sub][doc.id] = {
                    id: doc.id,// make ID explicit
                    ...pickBy(doc, (_, key) => key != 'metadata'),
                }
            }
        }
        download(`${event.id}-event-${new Date().toLocaleString(navigator.language, { timeStyle: 'short', dateStyle: 'short' }).replace(':', '-')}.json`, JSON.stringify({
            [event.id]: {
                ...(selected.value.meta ? (await getDocCacheOr(doc(fs, 'events', event.id))).data() : {}),
                ...subdocs,
            },
        }))
    } else {
        alert('Akce nenalezena')
    }
}
</script>