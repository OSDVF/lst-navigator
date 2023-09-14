<template>
    <article v-if="cloudStore.eventsCollection.length > 0">
        <button v-if="action == Actions.Nothing" @click="action = Actions.New">
            <IconCSS name="mdi:plus" /> Nová
        </button>
        <button v-if="action == Actions.Nothing && isSelection" @click="startEditingSelected">
            <IconCSS name="mdi:pencil" /> Upravit
        </button>
        <form v-if="action == Actions.New || action == Actions.Edit" @submit.prevent="editEvent(false)">
            <label>Název <input v-model="sanitizeTitleAndId" type="text" required :disabled="action == Actions.Edit"></label>
            &ensp;
            <small>
                <label>Vlastní identifikátor <input v-model="editedEvent.identifier" type="text" required :disabled="action == Actions.Edit"></label><br>
            </small>
            <label>Podtitulek <input v-model="editedEvent.subtitle" type="text" required></label><br>
            <label>Web <input v-model="editedEvent.web" placeholder="https://msmladez.cz" type="text" required></label><br>
            <label>Začátek <input v-model="editedEvent.start" type="date" required></label><br>
            <label>Konec <input v-model="editedEvent.end" :min="editedEvent.start!" type="date" required></label><br>
            <ClientOnly>
                <ckeditor v-if="ClassicEditor" v-model="editedEvent.description" :editor="ClassicEditor" />
            </ClientOnly>
            <fieldset :disabled="!!remoteImage.uploadTask.value">
                <legend>Obrázek</legend>
                <button type="button">
                    <IconCSS name="mdi:upload" @click="openFD({ accept: 'image/*', multiple: false })" /> Nahrát
                </button>
                <button type="button">
                    <IconCSS name="mdi:folder-multiple-image" @click="selectingImage = true" /> Vybrat
                </button>
                <StorageFileSelect v-if="selectingImage" v-model="editedEvent.imageIdentifier" />
                <p v-if="files?.length === 1">
                    Soubor k nahrání: {{ files.item(0)!.name }}
                </p>
                <label v-if="editedEvent.imageIdentifier">Výsledná lokace <input
                    v-model="editedEvent.imageIdentifier"
                    type="text"
                ></label>
            </fieldset>
            <input type="submit" value="Potvrdit">
        </form>
        <ProgressBar v-show="loading" />
        <LazyDataTable
            ref="table"
            :data="eventsIndexed" :options="{
                select: true,
                order: [[0, 'desc']]
            }" @select="selectionChanged" @unselect="selectionChanged"
        >
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Titulek</th>
                    <th>Začátek</th>
                    <th>Konec</th>
                </tr>
            </thead>
        </LazyDataTable>
    </article>
    <ProgressBar v-else />
</template>

<script setup lang="ts">
import { slugify } from '@vueuse/motion'
import { doc, setDoc, getDoc, CollectionReference, DocumentReference, collection } from 'firebase/firestore'
import { useFileDialog } from '@vueuse/core'
import { ref as storageRef } from 'firebase/storage'
import { useFirebaseStorage, useStorageFile } from 'vuefire'
import type { Api } from 'datatables.net-dt'
import { knownCollection, useCloudStore } from '@/stores/cloud'
import { toJSDate, toFirebaseDate as toStoreDate } from '@/utils/types'
import type { EventDescription, EventMeta, EventSubdocuments } from '~/types/cloud'

definePageMeta({
    title: 'Akce',
    layout: 'admin',
    middleware: ['auth']
})

const cloudStore = useCloudStore()
const lang = computed(() => process.client ? navigator.language : 'cs-CZ')
enum Actions {
    Nothing, New, Edit
}
const action = ref<Actions>(Actions.Nothing)
const selectingImage = ref(false)

const now = toStoreDate(new Date())
const editedEvent = ref({
    title: '',
    description: '',
    end: now,
    identifier: '',
    imageIdentifier: '',
    start: now,
    subtitle: '',
    web: ''
})
const loading = ref(false)

const sanitizeTitleAndId = computed({
    get() {
        return editedEvent.value.title
    },
    set(changedValue: string) {
        const oldValue = editedEvent.value.title
        if (changedValue !== oldValue) {
            if (editedEvent.value.identifier === slugify(oldValue)) {
                editedEvent.value.identifier = slugify(changedValue)
            }
        }
        editedEvent.value.title = changedValue
    }
})

const autoEventId = computed(() => slugify(editedEvent.value.title))

const storage = cloudStore.probe && useFirebaseStorage()
const fs = cloudStore.probe && useFirestore()
function knownDocument(pathOrCol: EventSubdocuments | CollectionReference, ...segments: (EventSubdocuments | string)[]) : DocumentReference | undefined {
    if (pathOrCol instanceof CollectionReference) {
        return doc(pathOrCol, ...segments)
    } else if (fs) {
        return doc(fs, pathOrCol, ...segments)
    }
}

const { files, open: openFD } = useFileDialog()
const remoteImage = useStorageFile(computed(() => storage ? storageRef(storage, `${autoEventId.value}/${files.value?.item(0)?.name ?? 'image'}`) : null))
function uploadImage() {
    const data = files.value?.item(0)
    if (data) {
        return remoteImage.upload(data)
    }
}

async function editEvent(createNew = false) {
    if (files.value?.length) {
        await uploadImage()
        if (remoteImage.metadata.value) {
            editedEvent.value.imageIdentifier = remoteImage.metadata.value.fullPath
        }
    }
    if (!fs) {
        return
    }
    const newDoc = doc(knownCollection(fs, 'events'), autoEventId.value)
    const col = collection(fs, autoEventId.value)
    const metaDoc = knownDocument(col, 'meta')!
    const notesDoc = knownDocument(col, 'notes')!
    const feedbackDoc = knownDocument(col, 'feedback')!
    const subscriptionsDoc = knownDocument(col, 'subscriptions')!
    const usersDoc = knownDocument(col, 'users')!
    if (createNew) {
        if ((await getDoc(newDoc)).exists()) {
            alert('Akce s tímto názvem již existuje')
            return
        }
        if ((await getDoc(metaDoc)).exists()) {
            alert('Dokument \'meta\' k akci s tímto názvem již existuje')
            return
        }
        if ((await getDoc(notesDoc)).exists()) {
            alert('Dokument \'notes\' k akci s tímto názvem již existuje')
            return
        }
        if ((await getDoc(feedbackDoc)).exists()) {
            alert('Dokument \'feedback\' k akci s tímto názvem již existuje')
            return
        }
        if ((await getDoc(subscriptionsDoc)).exists()) {
            alert('Dokument \'subscriptions\' k akci s tímto názvem již existuje')
            return
        }
        if ((await getDoc(usersDoc)).exists()) {
            alert('Dokument \'users\' k akci s tímto názvem již existuje')
            return
        }
    }

    setDoc(metaDoc, { // parent collections for subdoments are created automatically
        description: editedEvent.value.description,
        image: editedEvent.value.imageIdentifier

    } as EventMeta)

    setDoc(newDoc, {
        title: editedEvent.value.title,
        start: editedEvent.value.start,
        end: editedEvent.value.end
    } as EventDescription)
}

const eventsIndexed = computed(() => {
    const result = []
    if (cloudStore.eventsCollection) {
        for (const eventData of cloudStore.eventsCollection) {
            result.push([
                eventData.id,
                eventData.title,
                toJSDate(eventData.start)?.toLocaleDateString(lang.value),
                toJSDate(eventData.end)?.toLocaleDateString(lang.value)
            ])
        }
    }
    return result
})

const table = ref<{ dt: Api<typeof eventsIndexed.value> }>()
const isSelection = ref(false)
function selectionChanged() {
    if (table.value) {
        isSelection.value = table.value.dt.rows({ selected: true }).data().length > 0
    }
}
async function startEditingSelected() {
    if (table.value && fs) {
        const selectedData = table.value.dt.rows({ selected: true }).data()
        if (selectedData.length > 1) {
            alert('Vyberte jednu akci')
            return
        }
        const selectedEvent = cloudStore.eventsCollection.find(e => e.id === selectedData[0][0])
        if (selectedEvent) {
            loading.value = true
            const meta = await (await getDoc(doc(fs, selectedEvent.meta))).data() as EventMeta
            loading.value = false
            action.value = Actions.Edit
            editedEvent.value = {
                title: selectedEvent?.title,
                identifier: selectedEvent.id,
                description: meta.description,
                end: selectedEvent.end,
                imageIdentifier: meta.image,
                start: selectedEvent.start,
                subtitle: meta.subtitle,
                web: meta.web
            }
        }
    }
}
const ClassicEditor = ref()
onMounted(() => {
    import('@ckeditor/ckeditor5-build-classic').then((c) => {
        ClassicEditor.value = c.default
    })
})
</script>
