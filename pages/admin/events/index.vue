<template>
    <ProgressBar v-if='cloud.eventLoading' />
    <article v-else>
        <button
            v-if='action == Actions.Nothing && cloud.resolvedPermissions.superAdmin'
            @click='() => { action = Actions.New; table?.dt?.rows().deselect() }'>
            <Icon name='mdi:plus' /> Nová
        </button>
        <template v-if="isSelection && cloud.resolvedPermissions.editEvent && action == Actions.Nothing">
            <button @click='startEditingSelected'>
                <Icon name='mdi:pencil' /> Upravit
            </button>
            <button @click="$router.push(`/admin/events/${getSelectedEvent()?.id}/export`)">
                <Icon name='mdi:download' /> Export
            </button>

        </template>
        <ImportForm
            v-if="cloud.resolvedPermissions.superAdmin && [Actions.Nothing, Actions.New].includes(action)"
            ref="form" :truncate-option="importInto" @import="importJson" @error="e => error = e">
            <template #legend>
                {{ importText }}
            </template>
            {{ importText }}
        </ImportForm>
        <p v-if="error"><code>{{ error }}</code></p>
        <button
            v-if='action == Actions.Nothing && isSelection && cloud.resolvedPermissions.superAdmin'
            @click='deleteSelected'>
            <Icon name='mdi:trash-can' /> Smazat
        </button>
        <form
            v-if='[Actions.Edit, Actions.New].includes(action) && !form?.importing'
            @submit.prevent='editEvent(action == Actions.New)'>
            <h2>{{ { [Actions.Edit]: 'Upravit', [Actions.New]: 'Nová událost', [Actions.Nothing]: '' }[action] }}</h2>
            <label>Název <input v-model.lazy='sanitizeTitleAndId' type='text' required></label>
            &ensp;
            <small>
                <label title="Unikátní identifikátor, pod kterým bude událost uložena v databázi">Identifikátor <input
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
            &nbsp;
            <DateFormat /><br>
            <label>Konec <input
                v-model.lazy='editedEvent.end' :min='editedEvent.start!' type='date' required
                :disabled='action == Actions.Edit'></label>
            &nbsp;
            <DateFormat /><br>
            <label for="transfers">
                <Icon name="mdi:leak" /> Povolit přenosy uživatelských dat
            </label>
            <input id="transfers" v-model="editedEvent.transfers" type="checkbox" name="transfers">
            
            <br>
            <label for="advanced">
                <Icon name="mdi:account-settings" /> Povolit uživatelům pokročilá nastavení
            </label>
            <input id="advanced" v-model="editedEvent.advanced" type="checkbox" name="advanced">

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
                    <label v-if='editedEvent.imageIdentifier.type === "cloud"'>Výsledná lokace <input
                        v-model.lazy='editedEvent.imageIdentifier.data' type='text'></label>
                </p>
            </fieldset>
            <button type='submit' class="large">
                <Icon name="material-symbols:save" /> Uložit
            </button>
            <button type="reset" class="large" @click="action = Actions.Nothing">
                <Icon name="mdi:cancel" /> Zrušit
            </button>
            <hr>
        </form>
        <ProgressBar v-show='loading' />
        <LazyDataTable
            ref='table' :data='eventsIndexed' :options='{
                responsive: true,
                select: true,
                order: [[0, "desc"]]
            }' @select='selectionChanged' @deselect='selectionChanged'>
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
import { doc, collection, arrayUnion, type DocumentData, getDoc } from 'firebase/firestore'
import { getDocCacheOr, getDocs, setDoc, deleteDoc } from '~/utils/trace'
import { useFileDialog } from '@vueuse/core'
import { ref as storageRef } from 'firebase/storage'
import { useFirebaseStorage, useStorageFile } from 'vuefire'
import { eventDocs, useCloudStore } from '@/stores/cloud'
import { toFirebaseMonthDay, toJSDate, toFirebaseDate } from '@/utils/utils'
import { EventSubcollectionsList, type EventDescription, type ScheduleDay } from '~/types/cloud'
import { ImportForm } from '#components'
import pickBy from 'lodash.pickby'

import type { Api } from '~/types/datatables'

definePageMeta({
    title: 'Akce',
    layout: 'admin',
    middleware: ['auth'],
})

const cloud = useCloudStore()
const error = ref()
const lang = computed(() => import.meta.client ? navigator.language : 'cs-CZ')
enum Actions {
    Nothing, New, Edit
}
const action = ref<Actions>(Actions.Nothing)
const form = useTemplateRef<InstanceType<typeof ImportForm>>('form')

const now = toFirebaseDate(new Date())!
const editedEvent = ref({
    advanced: true,
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
    transfers: false,
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
            if (editedEvent.value.identifier === slugify(oldValue) && action.value == Actions.New) {
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
        if ((await getDocCacheOr(docs.event)).exists()) {
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
        advanced: editedEvent.value.advanced,
        title: editedEvent.value.title,
        start: toFirebaseDate(new Date(editedEvent.value.start)),
        end: toFirebaseDate(end),
        description: editedEvent.value.description,
        image: editedEvent.value.imageIdentifier,
        subtitle: editedEvent.value.subtitle,
        transfers: editedEvent.value.transfers,
        web: editedEvent.value.web,
    } as EventDescription<void>, { merge: true })

    for (let i = new Date(editedEvent.value.start); i <= end; i.setDate(i.getDate() + 1)) {
        const day = doc(docs.schedule, toFirebaseMonthDay(i))
        const dayContent = (await getDoc(day)).data() as ScheduleDay | undefined
        await setDoc(day, {
            cooking: null,
            date: toFirebaseDate(i),
            dishes: null,
            name: toTitleCase(i.toLocaleDateString(lang.value, { weekday: 'long', month: 'numeric', day: 'numeric' }).replace('. ', '. ')),
            program: arrayUnion(),
            manager: null,
            ...dayContent,
        }, { merge: true })
    }
    const dummies = [
        doc(docs.feedback, 'dummy'),
        doc(docs.notes, 'dummy'),
        doc(docs.subscriptions, 'dummy'),
        doc(docs.users, 'dummy'),
        doc(docs.feedbackConfig, 'dummy'),
        editedEvent.value.transfers ? doc(knownCollection(fs, 'transfers'), 'dummy') : undefined,
    ]

    // Create subcollections
    await Promise.allSettled(dummies.map(d => d && setDoc(d, {}, { merge: true })))

    dummies.map(d => d && deleteDoc(d))

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

const table = ref<{ dt?: Api<typeof eventsIndexed.value> }>()
const isSelection = ref(false)
const importInto = computed(() => isSelection.value && action.value != Actions.New)
const selectedTitle = ref<string>()
const importText = computed(() => importInto.value ? 'Importovat do ' + (selectedTitle.value ?? '...') : 'Importovat novou')
function selectionChanged() {
    if (table.value?.dt) {
        const data = table.value.dt.rows({ selected: true }).data()
        isSelection.value = data.length > 0
        selectedTitle.value = isSelection.value ? data[0][1] : undefined
    }

}
async function startEditingSelected() {
    if (table.value?.dt && fs) {
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
                advanced: selectedEvent.advanced ?? false,
                title: selectedEvent.title,
                identifier: selectedEvent.id,
                description: selectedEvent.description,
                end: selectedEvent.end,
                imageIdentifier: selectedEvent.image || {
                    type: 'cloud',
                    data: '',
                },
                start: selectedEvent.start,
                subtitle: selectedEvent.subtitle,
                transfers: selectedEvent.transfers ?? false,
                web: selectedEvent.web,
            }
        }
    }
}

function getSelectedEvent(silent = false): EventDescription<DocumentData> & { id: string } | undefined {
    if (!table.value?.dt) {
        if (!silent) {
            alert('Tabulka nenačtena')
        }
        return
    }
    const selectedData = table.value.dt.rows({ selected: true }).data()
    if (selectedData.length != 1) {
        if (!silent) {
            alert('Vyberte jednu akci')
        }
        return
    }
    return cloud.eventsCollection.find(e => e.id === selectedData[0][0])
}

function deleteSelected() {
    if (table.value && fs) {
        const selectedEvent = getSelectedEvent()
        if (selectedEvent) {
            if (confirm(`Opravdu chcete smazat akci ${selectedEvent.title}?`)) {
                deleteDoc(doc(fs, 'events', selectedEvent.id))
                deleteCollection(fs, collection(fs, selectedEvent.id), 10)// delete in the legacy doc tree
            }
        }
    }
}

async function importJson(source: EventDescription<DocumentData>, merge: boolean) {
    if (fs) {
        for (const importingEventId in source) {// there can be multiple events to import
            const data = source[importingEventId as keyof typeof source]
            const selected = getSelectedEvent(true)
            if (typeof data !== 'object') {
                alert('Neplatný formát')
                return
            }
            if (importInto.value && !selected) {
                if (!confirm('Nebyla nalezena vybraná událost. Importovat jako novou?')) {
                    return
                }
            }
            let docs = eventDocs(fs, importInto.value ? (selected?.id ?? importingEventId) : importingEventId)
            if (!selected) {
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
            const eventMetaProps = pickBy(data, (_, docKey) => !EventSubcollectionsList.includes(docKey as any))
            setDoc(docs.event, eventMetaProps, { merge })
            // Subdocuments
            for (const sub of EventSubcollectionsList) {
                if (data[sub as keyof typeof data]) {
                    for (const subKey in (data as any)[sub]) {// every document in the subcollection
                        const content = (data as any)[sub][subKey]
                        const id = content.id
                        delete content.id
                        setDoc(doc(docs[sub], id), content, { merge })
                    }
                }
            }
        }
    }
}

// https://stackoverflow.com/a/11934819
function toTitleCase(s: string) {
    return s.replace(/([^\s:-])([^\s:-]*)/g, function ($0, $1, $2) {
        return $1.toUpperCase() + $2.toLowerCase()
    })
}

</script>
