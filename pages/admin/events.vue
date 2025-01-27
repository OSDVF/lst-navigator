<template>
    <ProgressBar v-if='cloud.eventLoading' />
    <article v-else>
        <button v-if='action == Actions.Nothing && cloud.resolvedPermissions.superAdmin' @click='action = Actions.New'>
            <Icon name='mdi:plus' /> Nová
        </button>
        <button
            v-if='action == Actions.Nothing && isSelection && cloud.resolvedPermissions.editEvent'
            @click='startEditingSelected'>
            <Icon name='mdi:pencil' /> Upravit
        </button>
        <button
            v-if='action == Actions.Nothing && isSelection && cloud.resolvedPermissions.superAdmin'
            @click='deleteSelected'>
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
                :disabled='action == Actions.Edit'></label>
            <DateFormat /><br>
            <label>Konec <input
                v-model.lazy='editedEvent.end' :min='editedEvent.start!' type='date' required
                :disabled='action == Actions.Edit'></label>
            <DateFormat /><br>
            <ClassicCKEditor v-model.lazy='editedEvent.description' />
            <fieldset :disabled='!!remoteImage.uploadTask.value'>
                <legend>Obrázek</legend>
                <div class="p">
                    <button
                        type='button' :disabled="!storage"
                        :title="storage ? 'Nahrát do Firebase Storage' : 'Cloudové úložiště není dostupné'"
                        @click='openFD({ accept: "image/*", multiple: false })'>
                        <Icon name='mdi:upload' /> Nahrát
                    </button>
                    <template v-if="storage">
                        <input
                            id="image-select" v-model="editedEvent.imageIdentifier.type" type='radio'
                            name="imageSourceType" value="cloud" :disabled="!storage">
                        <label for="image-select">
                            <Icon name='mdi:folder-multiple-image' />
                        </label>
                    </template>
                    <input
                        id="image-url" v-model="editedEvent.imageIdentifier.type" type='radio' name="imageSourceType"
                        value="external">
                    <label for="image-url">
                        <Icon name='mdi:link' /> z existující URL
                    </label>

                    <StorageFileSelect
                        v-if='editedEvent.imageIdentifier.type === "cloud"'
                        v-model='editedEvent.imageIdentifier.data' />
                    <fieldset v-else>
                        <legend>Externí URL</legend>
                        <input
                            v-model.lazy="imageExternalUrl" type="text" name="imageUrl"
                            placeholder="Existující URL nebo data:image/...">
                        <p>
                            <ProgressBar v-if="loadingImage" />
                            <img
                                v-else-if="editedEvent.imageIdentifier.data" :src="editedEvent.imageIdentifier.data"
                                alt="Náhled" style="max-width: 100%">
                        </p>
                    </fieldset>
                </div>
                <p v-if='files?.length === 1'>
                    Soubor k nahrání: {{ files.item(0)!.name }}
                </p>

                <p>
                    <label v-if='editedEvent.imageIdentifier.type === "cloud"'>Výsledná lokace<input
                        v-model.lazy='editedEvent.imageIdentifier.data' type='text'></label>
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
</template>

<script setup lang='ts'>
import { slugify } from '@vueuse/motion'
import { doc, getDoc, getDocs, orderBy, query, limit, collection, writeBatch, type Query, arrayUnion } from 'firebase/firestore'
import { setDoc, deleteDoc } from '~/utils/trace'
import { useFileDialog } from '@vueuse/core'
import { ref as storageRef } from 'firebase/storage'
import { useFirebaseStorage, useStorageFile } from 'vuefire'
import { eventDocs, useCloudStore } from '@/stores/cloud'
import { toFirebaseMonthDay, toJSDate, toFirebaseDate } from '@/utils/types'
import type { EventDescription } from '~/types/cloud'
import type { Api } from '~/types/datatables'

definePageMeta({
    title: 'Akce',
    layout: 'admin',
    middleware: ['auth'],
})

const cloud = useCloudStore()
const lang = computed(() => import.meta.client ? navigator.language : 'cs-CZ')
enum Actions {
    Nothing, New, Edit
}
const action = ref<Actions>(Actions.Nothing)

const now = toFirebaseDate(new Date())!
const editedEvent = ref({
    title: '',
    description: '',
    end: now,
    identifier: '',
    imageIdentifier: {
        type: 'cloud',
        data: '',
    },
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

const loadingImage = ref(false)
const permittedTypes = ['png', 'jpg', 'jpe', 'web']
const imageExternalUrl = computed({
    get() {
        return editedEvent.value.imageIdentifier.data
    },
    set(changedValue: string) {
        if (!changedValue) {
            editedEvent.value.imageIdentifier.data = ''
            return
        }
        if (changedValue.length > 50000) {
            alert('Odkaz na obrázek musí být kratší než 50000 znaků. Tento má ' + changedValue.length)
            return
        }
        const lower = changedValue.toLowerCase()
        if (lower.startsWith('http://') || lower.startsWith('https://')) {
            loadingImage.value = true
            fetch(changedValue, { method: 'HEAD' }).then((response) => {
                if (response.ok) {
                    const contentType = response.headers.get('content-type')
                    if (contentType && permittedTypes.includes(contentType.substring(6, 9))) {
                        editedEvent.value.imageIdentifier.data = changedValue
                        return
                    }
                }
                alert('Odkaz na obrázek je neplatný')
            }).finally(() => {
                loadingImage.value = false
            })
        } else if (lower.startsWith('data:image/') && permittedTypes.includes(lower.substring(11, 14))) {
            editedEvent.value.imageIdentifier.data = changedValue
        } else {
            alert('Odkaz na obrázek je neplatný')
        }
        editedEvent.value.imageIdentifier = {
            type: 'external',
            data: changedValue,
        }
    },
})

const config = useRuntimeConfig()
const storage = cloud.probe && config.public.storageEnabled && useFirebaseStorage()
const fs = cloud.probe && useFirestore()

const { files, open: openFD } = useFileDialog()
const remoteImage = useStorageFile(computed(() => storage && editedEvent.value.identifier ? storageRef(storage, `${editedEvent.value.identifier}/${files.value?.item(0)?.name ?? 'image'}`) : null))
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
            editedEvent.value.imageIdentifier = {
                type: 'cloud',
                data: remoteImage.metadata.value.fullPath,
            }
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
        if (!(await getDocs(docs.feedback)).empty) {
            alert('Dokument \'feedback\' k akci s tímto názvem již existuje')
            return
        }
        if (!(await getDocs(docs.subscriptions)).empty) {
            alert('Dokument \'subscriptions\' k akci s tímto názvem již existuje')
            return
        }
        if (!(await getDocs(docs.schedule)).empty) {
            alert('Dokument \'schedule\' k akci s tímto názvem již existuje')
            return
        }
        if (!(await getDocs(docs.users)).empty) {
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
            name: toTitleCase(i.toLocaleDateString(lang.value, { weekday: 'long', month: 'numeric', day: 'numeric' }).replace('. ', '. ')),
            program: arrayUnion(),
            manager: null,
        }, { merge: true })
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
    if (cloud.eventsCollection) {
        for (const eventData of cloud.eventsCollection) {
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
        const selectedEvent = cloud.eventsCollection.find(e => e.id === selectedData[0][0])
        if (selectedEvent) {
            loading.value = true
            loading.value = false
            action.value = Actions.Edit
            editedEvent.value = {
                title: selectedEvent?.title,
                identifier: selectedEvent.id,
                description: selectedEvent.description,
                end: selectedEvent.end,
                imageIdentifier: selectedEvent.image || {
                    type: 'cloud',
                    data: '',
                },
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
        const selectedEvent = cloud.eventsCollection.find(e => e.id === selectedData[0][0])
        if (selectedEvent) {
            if (confirm(`Opravdu chcete smazat akci ${selectedEvent.title}?`)) {
                deleteDoc(doc(fs, 'events', selectedEvent.id))
                deleteCollection(selectedEvent.id, 10)
            }
        }
    }
}


async function deleteCollection(collectionPath: string, batchSize: number) {
    if (!fs) { return }
    if (config.public.logWrites) {
        console.log('Deleting collection ' + collectionPath)
    }
    const collectionRef = collection(fs, collectionPath)
    const q = query(collectionRef, orderBy('__name__'), limit(batchSize))

    return new Promise<void>((resolve, reject) => {
        deleteQueryBatch(q, resolve).catch(reject)
    })
}

async function deleteQueryBatch(query: Query, resolve: () => void) {
    if (!fs) { return }
    const snapshot = await getDocs(query)

    const batchSize = snapshot.size
    if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve()
        return
    }

    // Delete documents in a batch
    const batch = writeBatch(fs)
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
    })
    await batch.commit()

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    nextTick(() => {
        deleteQueryBatch(query, resolve)
    })
}

// https://stackoverflow.com/a/11934819
function toTitleCase(s: string) {
    return s.replace(/([^\s:-])([^\s:-]*)/g, function ($0, $1, $2) {
        return $1.toUpperCase() + $2.toLowerCase()
    })
}

</script>
