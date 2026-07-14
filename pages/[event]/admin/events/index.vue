<template>
    <ProgressBar v-if='cloud.eventLoading' />
    <div v-else>
        <button
            v-if='action == Actions.Nothing && cloud.resolvedPermissions.superAdmin'
            @click='() => { action = Actions.New; table?.dt?.rows().deselect() }'>
            <Icon name='mdi:plus' /> Nová
        </button>
        <template
            v-if="isSelection && (cloud.resolvedPermissions.superAdmin || boolToNum(cloud.user.info?.permissions?.[getSelectedEvent(true)?.id ?? '']) >= UserLevel.Admin) && action == Actions.Nothing">
            <button @click='startEditingSelected'>
                <Icon name='mdi:pencil' /> Upravit
            </button>
            <button
                @click="maybe(getSelectedEvent(), e => $router.push(`/${cloud.selectedEvent}/admin/events/export`))">
                <Icon name='mdi:download' /> Export
            </button>
            <button
                v-if="config.public.featureForms && isSelection && maybe(getSelectedEvent(true), d => d.formDocument ?? d.form)?.startsWith(applicationFormDocumentPrefix)"
                type="button" @click="action = Actions.ConnectForm">
                <Icon name="mdi:form-select" style="color: #7346ba" /> Nastavení přihlášky
            </button>
        </template>
        <button
            v-if="isSelection && getSelectedEvent(true)?.id != cloud.selectedEvent"
            @click="maybe(getSelectedEvent(), e => $router.push(`/${e.id}/admin/events`))">
            <Icon name="mdi:home-edit" /> Přepnout na událost
        </button>
        <ImportForm
            v-if="cloud.resolvedPermissions.superAdmin && [Actions.Nothing, Actions.New].includes(action)"
            ref="form" :truncate-option="importInto" @import="importJson" @error="(e:any) => error = e">
            <template #legend>
                {{ importText }}
            </template>
            <template #settings>
                <div>
                    <input id="shiftDateEnabled" v-model="shiftDateEnabled" type="checkbox">
                    <label for="shiftDateEnabled">Posunout datum události</label><br>
                    <template v-if="shiftDateEnabled">
                        <input id="shiftDate" v-model="shiftDate" type="date">&nbsp;
                        <DateFormat />
                    </template>
                </div>
            </template>
            {{ importText }}
        </ImportForm>
        <p v-if="error" class="error"><code>{{ error }}</code></p>
        <button
            v-if='action == Actions.Nothing && isSelection && cloud.resolvedPermissions.superAdmin'
            @click='deleteSelected'>
            <Icon name='mdi:trash-can' /> Smazat
        </button>
        &ensp;
        <span v-show="action == Actions.Nothing && selectedTitle" class="button small" @click="deselect">
            <Icon name="mdi:select-off" />Zrušit označení
        </span>

        <FormSettings
            v-if="action == Actions.ConnectForm" :event-id="getSelectedEvent(true)?.id"
            @edit="startEditingSelected()" @return="action = Actions.Nothing" />

        <form
            v-else-if='[Actions.Edit, Actions.New].includes(action) && !form?.importing' class="p-2"
            @submit.prevent='editEvent(action == Actions.New)'>
            <h2>{{ {
                [Actions.Edit]: 'Upravit', [Actions.New]: 'Nová událost', [Actions.Nothing]: '',
            }[action] }}</h2>

            <div style="float:right">
                <button type='submit' class="large">
                    <Icon name="material-symbols:save" /> Uložit
                </button>
                <button type="reset" class="large" @click="action = Actions.Nothing">
                    <Icon name="mdi:cancel" /> Zrušit
                </button>
            </div>

            <label>Název <input v-model.lazy='sanitizeTitleAndId' type='text' required></label>
            &ensp;
            <small>
                <label title="Unikátní identifikátor, pod kterým bude událost uložena v databázi">Identifikátor <input
                    v-model.lazy='editedEvent.identifier' type='text' required
                    :disabled='action == Actions.Edit'></label><br>
            </small>
            <label>Podtitulek&ensp;<input v-model.lazy='editedEvent.subtitle' type='text'></label>
            <div class="flex-center mt-1">
                <label class="nowrap" for="icon">
                    <abbr
                        :title="'Štítky pomáhají odlišit události pro různé organizace nebo skupiny účastníků. Aplikace pod touto doménou ve výchozím stavu zobrazuje štítky: ' + (filterTags.length ? filterTags.join(', ') : 'všechny.')">
                        <Icon name="mdi:tag" />&ensp;
                        Štítky
                    </abbr>
                </label>&ensp;
                <TagsSelect
                    id="tags" v-model="editedEvent.tags"
                    :allow-empty="!filterTags.length || cloud.resolvedPermissions.superAdmin" :options="allTags"
                    @tag="(tag: string) => { allTags = [...allTags, tag]; editedEvent.tags.push(tag) }" />
            </div>
            <br>

            <label>
                <Icon name="mdi:link" style="transform: rotate(45deg);" /> Web&ensp;<input
                    v-model.lazy='editedEvent.web' placeholder='https://msmladez.cz' type='url' required>
            </label><br>
            <label>Doba konání od&ensp;<input
                v-model.lazy='editedEvent.start' type='date' required
                :disabled='action == Actions.Edit'></label>
            &nbsp;
            <label>do&ensp;<input
                v-model.lazy='editedEvent.end' :min='editedEvent.start!' type='date' required
                :disabled='action == Actions.Edit'></label>
            &nbsp;
            <DateFormat /><br>

            <label
                title="Zobrazit veřejně na seznamu událostí na úvodní stránce aplikace. Pokud nezadáte nic, bude se zobrazovat ode dneška do posledního dne konání události.">
                Zobrazení od&ensp;<input v-model.lazy='editedEvent.showFrom' type='date'></label>
            &nbsp;
            <label>do&ensp;<input v-model.lazy='editedEvent.showTo' :min='editedEvent.showFrom!' type='date'></label>
            &nbsp;
            <DateFormat /><br>

            <label>
                <Icon name="mdi:clock-edit-outline" /> Vlastní pořadí na úvodní stránce <input
                    v-model="customOrder"
                    type="checkbox">
            </label>
            <label v-if="customOrder" title="Seřadit na úvodní stránce jako kdyby událost začínala v tento den.">
                Pořadí&ensp;<input v-model.lazy='editedEvent.order' type='date'></label>
            <br>

            <label title="Pokud toto pole bude prázdné, feedback bude přijímán jen do posledního dne konání události">
                <Icon name="mdi:rss" /> Přijímá feedback do&ensp;<input
                    v-model.lazy='editedEvent.feedbackEnd'
                    :min='toInputDate(new Date(new Date(editedEvent.start!).getTime() - oneDay))' type='date'>
            </label>
            &nbsp;
            <DateFormat /><br>

            <details>
                <summary>
                    <FormInput v-model="editedEvent.form" :document="editedEvent.formDocument" />
                </summary>

                <div class="mb-2 ml-2">
                    <FormDocumentInput v-model="editedEvent.formDocument" :form-url="editedEvent.form" /><br>

                    <label>Začátek přihlašování&ensp;<input
                        v-model.lazy='editedEvent.applicationsStart'
                        type='date'></label>
                    &nbsp;
                    <DateFormat /><br>
                    <label>Konec přihlašování&ensp;<input
                        v-model.lazy='editedEvent.applicationsEnd'
                        :min='editedEvent.applicationsStart!' type='date'></label>
                    &nbsp;
                    <DateFormat />
                </div>
            </details>

            <label for="participantSection" title="Uživatelé mohou zobrazit stav své přihlášky, skupinky a služby.">
                <Icon name="mdi:hail" /> Účastnická sekce
            </label>
            <input
                id="participantSection" v-model="editedEvent.participantSection" type="checkbox"
                name="participantSection">

            <label for="transfers">
                <Icon name="mdi:leak" /> Povolit přenosy uživatelských dat
            </label>
            <input id="transfers" v-model="editedEvent.transfers" type="checkbox" name="transfers">

            <br>
            <label for="advanced" title="Např. manuální synchronizace feedbacku a poznámek">
                <Icon name="mdi:account-settings" /> Povolit uživatelům pokročilá nastavení
            </label>
            <input id="advanced" v-model="editedEvent.advanced" type="checkbox" name="advanced">

            <ClassicCKEditor v-model.lazy='editedEvent.description' placeholder="Popis události" />

            <details :disabled='!!remoteImage.uploadTask.value' class="mt-2">
                <summary>
                    <Icon name="mdi:image" /> Obrázek
                </summary>
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
                                v-else-if="editedEvent.imageIdentifier.data" class="noinvert"
                                :src="editedEvent.imageIdentifier.data" alt="Náhled" style="max-width: 100%">
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
            </details>
            <button type='submit' class="large">
                <Icon name="material-symbols:save" /> Uložit
            </button>
            <button type="reset" class="large" @click="action = Actions.Nothing">
                <Icon name="mdi:cancel" /> Zrušit
            </button>
            <hr>
        </form>
        <LazyDataTable
            v-if="showTable" ref='table' :data='eventsIndexed' :options='{
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
                    <th v-if="cloud.resolvedPermissions.superAdmin && !admin.onlyTaggedEvents">Štítky</th>
                </tr>
            </thead>
        </LazyDataTable>
        <Teleport v-if="mounted" to="#topNav">
            <label>
                <input
                    v-model="admin.onlyTaggedEvents" type="checkbox"
                    @change="showTable = false; nextTick(() => showTable = true)"> Jen se štítkem <code>{{
                        config.public.filterTags
                    }}</code>
            </label>
        </Teleport>
    </div>
</template>

<script setup lang='ts'>
import { slugify } from '@vueuse/motion'
import { doc, collection, arrayUnion, type DocumentData, getDoc, deleteField, type CollectionReference } from 'firebase/firestore'
import { getDocCacheOr, getDocs, setDoc, deleteDoc } from '~/utils/trace'
import { useFileDialog } from '@vueuse/core'
import { ref as storageRef } from 'firebase/storage'
import { useFirebaseStorage, useStorageFile } from 'vuefire'
import { eventDocs, useCloudStore } from '@/stores/cloud'
import { toFirebaseMonthDay, toJSDate, toFirebaseDate, useLang } from '@/utils/utils'
import { EventSubcollectionsList, UserLevel, type EventDescription, type ScheduleDay } from '~/types/cloud'
import { ImportForm } from '#components'
import pickBy from 'lodash.pickby'
import { stringify } from 'devalue'

import type { Api } from '~/types/datatables'
import { captureException } from '@sentry/nuxt'
import { GoogleAuthProvider } from 'firebase/auth'

definePageMeta({
    title: 'Správa akcí',
    layout: 'admin',
    middleware: ['auth'],
})

const oneDay = 1000 * 3600 * 24
const admin = useAdmin()
const cloud = useCloudStore()
const error = ref()
const gapi = useGapi()
const lang = useLang()
const ui = useUI()
enum Actions {
    Nothing, New, Edit, ConnectForm
}
const action = ref<Actions>(Actions.Nothing)
const config = useRuntimeConfig()
const filterTags = config.public.filterTags.split(',').map(t => t.trim()) ?? [] as string[]
const form = useTemplateRef<InstanceType<typeof ImportForm>>('form')

const mounted = ref(false)
onMounted(() => mounted.value = true)

const now = toFirebaseDate(new Date())!
const editedEvent = ref({
    advanced: true,
    applicationsEnd: '',
    applicationsStart: '',
    title: '',
    description: '',
    end: now,
    form: '',
    formDocument: '',
    feedbackEnd: '',
    order: '',
    participantSection: true,
    identifier: '',
    imageIdentifier: {
        type: 'cloud',
        data: '',
    },
    start: now,
    showFrom: now,
    showTo: '',
    subtitle: '',
    transfers: false,
    tags: filterTags,
    web: '',
})
const customOrder = computed({
    get() {
        return !!editedEvent.value.order
    },
    set(value: boolean) {
        if (value && !editedEvent.value.order) {
            editedEvent.value.order = editedEvent.value.start
        } else if (!value) {
            editedEvent.value.order = ''
        }
    },
})

const otherEventsTags = computed(() => [...new Set(cloud.eventsCollection.map(e => e.tags ?? []).flat().concat(filterTags)).values()])
const _allTags = ref(otherEventsTags.value)
const allTags = computed({
    get() {
        return _allTags.value
    },
    set(value: string[]) {
        _allTags.value = [...new Set([..._allTags.value, ...value]).values()]
    },
})

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

async function normalizeForms() {
    try {
        if (!editedEvent.value.form) {
            editedEvent.value.formDocument = ''
            return
        }
        const formDocUrlIsDoc = editedEvent.value.formDocument.startsWith(applicationFormDocumentPrefix)
        const formUrlIsDoc = typeof extractFormIdFromURL(editedEvent.value.form) != 'undefined'
        if (!editedEvent.value.formDocument && !formUrlIsDoc && !formDocUrlIsDoc) {
            return
        }
        if (cloud.user.auth?.providerData[0].providerId != GoogleAuthProvider.PROVIDER_ID && !gapi.loading) {
            if (confirm('Pokud chcete v budoucnu propojit událost s Google Forms přihláškou, přihlašte se, prosím, k účtu Google, který má k formuláři přístup.')) {
                await gapi.client()
            } else {
                return
            }
        }
        if (gapi.loading) {
            if (!confirm('Přihlášení ke Google nebylo dokončeno. Chcete přesto pokračovat?')) {
                return
            }
        }
        const wrongURLError = 'Je třeba zadat adresu upravitelného souboru formuláře na Disku Google (https://docs.google.com/forms/d/.../edit).'
        const client = await gapi.client()
        if (formDocUrlIsDoc && !formUrlIsDoc) {
            const id = extractFormIdFromURL(editedEvent.value.formDocument)
            if (!id) {
                throw new Error(wrongURLError)
            }
            const result = await client.forms.forms.get({
                formId: id,
                fields: 'responderUri,info',
            })
            if (!editedEvent.value.form.startsWith(applicationFormShortUrlPrefix)) {
                if (result.result.responderUri && result.result.info) {
                    if (editedEvent.value.form != result.result.responderUri) {
                        if (confirm(`Zadaný odkaz na vyplnění přihlášky ${result.result.info.title} (${editedEvent.value.form}) se liší od výchozí adresy uložené v dokumentu ${result.result.info.documentTitle} na Google Disku (${editedEvent.value.formDocument}). ` +
                            '\nChcete ji přepsat adresou z dokumentu?',
                        )) {
                            editedEvent.value.form = result.result.responderUri
                        }
                    }
                }
            }
        } else {
            const id = extractFormIdFromURL(editedEvent.value.form)
            if (!id) {
                throw new Error(wrongURLError)
            }
            const result = await client.forms.forms.get({
                formId: id,
                fields: 'responderUri,info',
            })
            if (result.result.responderUri) {
                editedEvent.value.formDocument = editedEvent.value.form
                editedEvent.value.form = result.result.responderUri
            }

        }
    } catch (e) {
        captureException(e)
        error.value = 'Could not load Google Form: ' + (typeof e == 'object' ? ((e && 'result' in e) ? stringify(e.result) : e instanceof Error ? e.message : stringify(e)) : ' unknown error')
        console.error(e)
    }

}

async function editEvent(createNew = false) {
    using _ = ui.loading()
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
        for (const key in docs) {
            if (key == 'event') {
                if ((await getDocCacheOr(docs.event)).exists()) {
                    alert('Akce s tímto názvem již existuje')
                    return
                }
                continue
            }
            const doc = docs[key as keyof typeof docs]
            if (!((await getDocs(doc as CollectionReference)).empty)) {
                alert(`Kolekce '${key}'  k akci ${editedEvent.value.identifier} již existuje`)
                return
            }
        }
    }

    // normalize application form URL
    editedEvent.value.formDocument = editedEvent.value.formDocument.trim()
    editedEvent.value.form = editedEvent.value.form.trim()
    if (config.public.featureForms) {
        await normalizeForms()
    }

    const end = new Date(editedEvent.value.end)
    await setDoc(docs.event, {// create /events/[event-name]
        advanced: editedEvent.value.advanced,
        applicationsEnd: toFirebaseDate(new Date(editedEvent.value.applicationsEnd)) || deleteField(),
        applicationsStart: toFirebaseDate(new Date(editedEvent.value.applicationsStart)) || deleteField(),
        title: editedEvent.value.title,
        start: toFirebaseDate(new Date(editedEvent.value.start)),
        end: toFirebaseDate(end),
        form: editedEvent.value.form || deleteField(),
        formDocument: editedEvent.value.formDocument || deleteField(),
        feedbackEnd: toFirebaseDate(new Date(editedEvent.value.feedbackEnd)) || deleteField(),
        order: toFirebaseDate(new Date(editedEvent.value.order)) || deleteField(),
        participantSection: editedEvent.value.participantSection,
        description: editedEvent.value.description,
        image: editedEvent.value.imageIdentifier,
        showFrom: toFirebaseDate(new Date(editedEvent.value.showFrom)) || deleteField(),
        showTo: toFirebaseDate(new Date(editedEvent.value.showTo)) || deleteField(),
        subtitle: editedEvent.value.subtitle,
        transfers: editedEvent.value.transfers,
        tags: editedEvent.value.tags,
        web: editedEvent.value.web,
    } as EventDescription<void>, { merge: true })

    for (let i = new Date(editedEvent.value.start); i <= end; i.setDate(i.getDate() + 1)) {
        const day = doc(docs.schedule, toFirebaseMonthDay(i))
        const dayContent = (await getDoc(day)).data() as ScheduleDay | undefined
        await setDoc(day, {
            cooking: null,
            date: toFirebaseDate(i),
            dishes: null,
            name: dayName(i),
            program: arrayUnion(),
            manager: null,
            ...dayContent,
        }, { merge: true })
    }
    const dummies = [
        ...Object.keys(docs).filter(p => p != 'event').map(k => doc(docs[k as keyof typeof docs] as CollectionReference, 'dummy')),
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
                eventData.title + ((eventData.formDocument && extractFormIdFromURL(eventData.formDocument)) ? useIconEl('form-select', 'Má přihlášku', 'background: #7346ba;margin-left:.5rem') : ''),
                toJSDate(eventData.start)?.toLocaleDateString(lang.value),
                toJSDate(eventData.end)?.toLocaleDateString(lang.value),
                ...((cloud.resolvedPermissions.superAdmin && !admin.onlyTaggedEvents) ? [eventData.tags ?? ''] : ['']),
            ])
        }
    }
    return result
})

const showTable = ref(true)
const table = ref<{ dt?: Api<typeof eventsIndexed.value> }>()
const isSelection = ref(false)
const importInto = computed(() => isSelection.value && action.value != Actions.New)
const selectedTitle = ref<string>()
const shiftDateEnabled = ref(false)
const shiftDate = ref<string>()
const importText = computed(() => importInto.value ? 'Importovat do ' + (selectedTitle.value ?? '...') : 'Importovat novou')
function selectionChanged() {
    if (table.value?.dt) {
        const data = table.value.dt.rows({ selected: true }).data()
        isSelection.value = data.length > 0
        selectedTitle.value = isSelection.value ? cloud.eventsCollection.find(e => e.id == data[0][0])?.title : undefined
    }

}
function deselect() {
    table.value?.dt?.rows().deselect()
    selectedTitle.value = undefined
    isSelection.value = false
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
            action.value = Actions.Edit
            editedEvent.value = {
                applicationsEnd: selectedEvent.applicationsEnd ?? '',
                applicationsStart: selectedEvent.applicationsStart ?? '',
                advanced: selectedEvent.advanced ?? false,
                title: selectedEvent.title,
                identifier: selectedEvent.id,
                description: selectedEvent.description,
                end: selectedEvent.end,
                form: selectedEvent.form ?? '',
                formDocument: selectedEvent.formDocument ?? '',
                feedbackEnd: selectedEvent.feedbackEnd ?? '',
                order: selectedEvent.order ?? '',
                participantSection: selectedEvent.participantSection ?? false,
                imageIdentifier: selectedEvent.image || {
                    type: 'cloud',
                    data: '',
                },
                showFrom: selectedEvent.showFrom ?? '',
                showTo: selectedEvent.showTo ?? '',
                start: selectedEvent.start,
                subtitle: selectedEvent.subtitle,
                tags: selectedEvent.tags || [],
                transfers: selectedEvent.transfers ?? false,
                web: selectedEvent.web,
            }
        }
    }
}

function getSelectedEvent(silent = false): EventDescription<void> & { id: string } | undefined {
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
                const keep = config.public.keepOrphanCollections.split(',')
                for (const col of EventSubcollectionsList.filter(a => !keep.includes(a))) {
                    deleteCollection(eventSubCollection(fs, selectedEvent.id, col))
                }

                deleteCollection(collection(fs, selectedEvent.id))// delete in the legacy doc tree
                deselect()
            }
        }
    }
}

async function importJson(source: Record<string, EventDescription<DocumentData>>, merge: boolean) {
    //TODO create dummy schedule
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
                    sortedDays[i]!.name = dayName(thisDate)
                    data.schedule[id] = sortedDays[i]
                }
            }
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

function dayName(date: Date) {
    return toTitleCase(date.toLocaleDateString(lang.value, { weekday: 'long', month: 'numeric', day: 'numeric' }).replace('. ', '. '))
}

</script>
