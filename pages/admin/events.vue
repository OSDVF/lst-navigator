<template>
    <article v-if='cloudStore.eventsCollection.length > 0'>
        <button v-if='action == Actions.Nothing' @click='action = Actions.New'>
            <Icon name='mdi:plus' /> Nová
        </button>
        <button v-if='action == Actions.Nothing && isSelection' @click='startEditingSelected'>
            <Icon name='mdi:pencil' /> Upravit
        </button>
        <button v-if='action == Actions.Nothing && isSelection' @click='deleteSelected'>
            <Icon name='mdi:trash-can' /> Smazat
        </button>
        <form v-if='action == Actions.New || action == Actions.Edit' @submit.prevent='editEvent(action == Actions.New)'>
            <label>Název <input
                v-model.lazy='sanitizeTitleAndId' type='text' required
                :disabled='action == Actions.Edit'></label>
            &ensp;
            <small>
                <label>Vlastní identifikátor <input
                    v-model.lazy='editedEvent.identifier' type='text' required
                    :disabled='action == Actions.Edit'></label><br>
            </small>
            <label>Podtitulek <input v-model.lazy='editedEvent.subtitle' type='text'></label><br>
            <label>Web <input
                v-model.lazy='editedEvent.web' placeholder='https://msmladez.cz' type='text'
                required></label><br>
            <label>Začátek <input
                v-model.lazy='editedEvent.start' type='date' required
                :disabled='action == Actions.Edit'></label><br>
            <label>Konec <input
                v-model.lazy='editedEvent.end' :min='editedEvent.start!' type='date' required
                :disabled='action == Actions.Edit'></label><br>
            <ClientOnly>
                <ckeditor v-if='ClassicEditor' v-model='editedEvent.description' :editor='ClassicEditor' />
            </ClientOnly>
            <fieldset :disabled='!!remoteImage.uploadTask.value'>
                <legend>Obrázek</legend>
                <p>
                    <button type='button' @click='openFD({ accept: "image/*", multiple: false })'>
                        <Icon name='mdi:upload' /> Nahrát
                    </button>
                    <button type='button' @click='selectingImage = true'>
                        <Icon name='mdi:folder-multiple-image' /> Vybrat
                    </button>
                    <StorageFileSelect v-if='selectingImage' v-model='editedEvent.imageIdentifier' />
                </p>
                <p v-if='files?.length === 1'>
                    Soubor k nahrání: {{ files.item(0)!.name }}
                </p>

                <p>
                    <label v-if='editedEvent.imageIdentifier'>Výsledná lokace <input
                        v-model='editedEvent.imageIdentifier' type='text'></label>
                </p>
            </fieldset>
            <input type='submit' value='Potvrdit'>
        </form>
        <ProgressBar v-show='loading' />
        <LazyDataTable
            ref='table' :data='eventsIndexed' :options='{
                responsive: true,
                select: true,
                order: [[0, "desc"]]
            }' @select='selectionChanged' @unselect='selectionChanged'>
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

<script setup lang='ts'>
import { slugify } from '@vueuse/motion'
import { doc, getDoc, getDocs, orderBy, query, limit, collection, writeBatch, type Query } from 'firebase/firestore'
import { setDoc, deleteDoc } from '~/utils/trace'
import { useFileDialog } from '@vueuse/core'
import { ref as storageRef } from 'firebase/storage'
import { useFirebaseStorage, useStorageFile } from 'vuefire'
import { eventDocs, useCloudStore } from '@/stores/cloud'
import { toFirebaseMonthDay, toJSDate, toFirebaseDate } from '@/utils/types'
import type { EventDescription, ScheduleDay } from '~/types/cloud'
import type { Api } from '~/types/datatables'

definePageMeta({
    title: 'Akce',
    layout: 'admin',
    middleware: ['auth'],
})

const cloudStore = useCloudStore()
const lang = computed(() => import.meta.client ? navigator.language : 'cs-CZ')
enum Actions {
    Nothing, New, Edit
}
const action = ref<Actions>(Actions.Nothing)
const selectingImage = ref(false)

const now = toFirebaseDate(new Date())!
const editedEvent = ref({
    title: '',
    description: '',
    end: now,
    identifier: '',
    imageIdentifier: '',
    start: now,
    subtitle: '',
    web: '',
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
    },
})

const storage = cloudStore.probe && useFirebaseStorage()
const fs = cloudStore.probe && useFirestore()

const { files, open: openFD } = useFileDialog()
const remoteImage = useStorageFile(computed(() => storage ? storageRef(storage, `${editedEvent.value.identifier}/${files.value?.item(0)?.name ?? 'image'}`) : null))
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
    const docs = eventDocs(fs, editedEvent.value.identifier)
    if (createNew) {
        if ((await getDoc(docs.event)).exists()) {
            alert('Akce s tímto názvem již existuje')
            return
        }
        if (!((await getDocs(docs.notes)).empty)) {
            alert('Dokument \'notes\' k akci s tímto názvem již existuje')
            return
        }
        if ((await getDocs(docs.feedback)).empty) {
            alert('Dokument \'feedback\' k akci s tímto názvem již existuje')
            return
        }
        if ((await getDocs(docs.subscriptions)).empty) {
            alert('Dokument \'subscriptions\' k akci s tímto názvem již existuje')
            return
        }
        if ((await getDocs(docs.schedule)).empty) {
            alert('Dokument \'schedule\' k akci s tímto názvem již existuje')
            return
        }
        if ((await getDocs(docs.users)).empty) {
            alert('Dokument \'users\' k akci s tímto názvem již existuje')
            return
        }
    }

    const end = new Date(editedEvent.value.end)
    await setDoc(docs.event, {// create /events/[event-name]
        title: editedEvent.value.title,
        start: toFirebaseDate(new Date(editedEvent.value.start)),
        end: toFirebaseDate(end),
        description: editedEvent.value.description,
        image: editedEvent.value.imageIdentifier,
        subtitle: editedEvent.value.subtitle,
        web: editedEvent.value.web,
    } as EventDescription<void>, { merge: true })

    for (let i = new Date(editedEvent.value.start); i <= end; i.setDate(i.getDate() + 1)) {
        await setDoc(doc(docs.schedule, toFirebaseMonthDay(i)), {
            cooking: null,
            date: toFirebaseDate(i),
            dishes: null,
            name: toTitleCase(i.toLocaleDateString(lang.value, { weekday: 'long', month: 'numeric', day: 'numeric' })),
            program: [],
            manager: null,
        } as ScheduleDay, { merge: true });
    }

    // Create subcollections
    await Promise.allSettled([
        setDoc(doc(docs.feedback, 'dummy'), {}, { merge: true }),
        setDoc(doc(docs.notes, 'dummy'), {}, { merge: true }),
        setDoc(doc(docs.subscriptions, 'dummy'), {}, { merge: true }),
        setDoc(doc(docs.users, 'dummy'), {}, { merge: true }),
        setDoc(doc(docs.feedbackConfig, 'dummy'), {}, { merge: true }),
    ])

    deleteDoc(doc(docs.feedback, 'dummy'))
    deleteDoc(doc(docs.notes, 'dummy'))
    deleteDoc(doc(docs.subscriptions, 'dummy'))
    deleteDoc(doc(docs.users, 'dummy'))
    deleteDoc(doc(docs.feedbackConfig, 'dummy'))

    action.value = Actions.Nothing
}

const eventsIndexed = computed(() => {
    const result = []
    if (cloudStore.eventsCollection) {
        for (const eventData of cloudStore.eventsCollection) {
            result.push([
                eventData.id,
                eventData.title,
                toJSDate(eventData.start)?.toLocaleDateString(lang.value),
                toJSDate(eventData.end)?.toLocaleDateString(lang.value),
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
            loading.value = false
            action.value = Actions.Edit
            editedEvent.value = {
                title: selectedEvent?.title,
                identifier: selectedEvent.id,
                description: selectedEvent.description,
                end: selectedEvent.end,
                imageIdentifier: selectedEvent.image,
                start: selectedEvent.start,
                subtitle: selectedEvent.subtitle,
                web: selectedEvent.web,
            }
        }
    }
}
function deleteSelected() {
    if (table.value && fs) {
        const selectedData = table.value.dt.rows({ selected: true }).data()
        if (selectedData.length > 1) {
            alert('Vyberte jednu akci')
            return
        }
        const selectedEvent = cloudStore.eventsCollection.find(e => e.id === selectedData[0][0])
        if (selectedEvent) {
            if (confirm(`Opravdu chcete smazat akci ${selectedEvent.title}?`)) {
                deleteDoc(doc(fs, 'events', selectedEvent.id))
                deleteCollection(selectedEvent.id, 10)
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

async function deleteCollection(collectionPath: string, batchSize: number) {
    if (!fs) return
    const collectionRef = collection(fs, collectionPath);
    const q = query(collectionRef, orderBy('__name__'), limit(batchSize))

    return new Promise<void>((resolve, reject) => {
        deleteQueryBatch(q, resolve).catch(reject);
    });
}

async function deleteQueryBatch(query: Query, resolve: () => void) {
    if (!fs) return
    const snapshot = await getDocs(query)

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve();
        return;
    }

    // Delete documents in a batch
    const batch = writeBatch(fs);
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    nextTick(() => {
        deleteQueryBatch(query, resolve);
    });
}

function toTitleCase(s: string) {
    return s.replace(/\w\S*/ug, (txt) => txt[0].toUpperCase() + txt.substring(1).toLowerCase());
}

</script>
