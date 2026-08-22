<template>
    <form
        v-if="(editing && cloud.resolvedPermissions.editEvent) || cloud.resolvedPermissions.superAdmin" class="p-2"
        @submit.prevent='editEvent(!editing)'>
        <h2>{{ editing ? 'Upravit událost' : 'Nová událost' }}</h2>

        <div style="float:right;text-align: right">
            <button type='submit' class="large">
                <Icon name="material-symbols:save" /> Uložit
            </button>
            <NuxtLink
                :to="{name: 'event-admin-events'}">
                <button type="reset" class="large">
                    <Icon name="mdi:cancel" /> Zrušit
                </button>
            </NuxtLink>
            <br>
            <NuxtLink
                :to="{
                    name: 'event-admin-events-import',
                    params: {
                        event: $router.currentRoute.value.params.event
                    }
                }">
                <button type="button">
                    <Icon name="mdi:import" class="mr-0.5" /> Importovat
                </button>
            </NuxtLink>
        </div>

        <label>Název <input v-model.lazy='sanitizeTitleAndId' type='text' required></label>
        &ensp;
        <small>
            <label title="Unikátní identifikátor, pod kterým bude událost uložena v databázi">Identifikátor <input
                v-model.lazy='eventToEdit.id' type='text' required :disabled='editing'></label><br>
        </small>
        <label>Podtitulek&ensp;<input v-model.lazy='eventToEdit.subtitle' type='text'></label>
        <div class="flex-center mt-1">
            <label class="nowrap" for="icon">
                <Icon name="mdi:tag" />&ensp;
                <abbr
                    :title="'Štítky pomáhají odlišit události pro různé organizace nebo skupiny účastníků. Aplikace pod touto doménou ve výchozím stavu zobrazuje štítky: ' + (cloud.filterTags.length ? cloud.filterTags.join(', ') : 'všechny.')">
                    Štítky
                </abbr>
            </label>&ensp;
            <TagsSelect
                id="tags" v-model="eventToEdit.tags"
                :allow-empty="!cloud.filterTags.length || cloud.resolvedPermissions.superAdmin" :options="cloud.allTags"
                @tag="(tag: string) => { cloud.allTags = [...cloud.allTags, tag]; eventToEdit.tags.push(tag) }" />
        </div>
        <br>

        <label>
            <Icon name="mdi:link" style="transform: rotate(45deg);" /> Web&ensp;<input
                v-model.lazy='eventToEdit.web'
                placeholder='https://msmladez.cz' type='url' required>
        </label><br>
        <label>Doba konání od&ensp;<input
            v-model.lazy='eventToEdit.start' type='date' required
            :disabled='editing'></label>
        &nbsp;
        <label>do&ensp;<input
            v-model.lazy='eventToEdit.end' :min='eventToEdit.start!' type='date' required
            :disabled='editing'></label>
        &nbsp;
        <DateFormat /><br>

        <label
            title="Zobrazit veřejně na seznamu událostí na úvodní stránce aplikace. Pokud nezadáte nic, bude se zobrazovat ode dneška do posledního dne konání události.">
            Zobrazení od&ensp;<input v-model.lazy='eventToEdit.showFrom' type='date'></label>
        &nbsp;
        <label>do&ensp;<input v-model.lazy='eventToEdit.showTo' :min='eventToEdit.showFrom!' type='date'></label>
        &nbsp;
        <DateFormat /><br>

        <label>
            <Icon name="mdi:clock-edit-outline" /> Vlastní pořadí na úvodní stránce <input
                v-model="customOrder"
                type="checkbox">
        </label>
        <label v-if="customOrder" title="Seřadit na úvodní stránce jako kdyby událost začínala v tento den.">
            Pořadí&ensp;<input v-model.lazy='eventToEdit.order' type='date'></label>
        <br>

        <label title="Pokud toto pole bude prázdné, feedback bude přijímán jen do posledního dne konání události">
            <Icon name="mdi:rss" /> Přijímá feedback do&ensp;<input
                v-model.lazy='eventToEdit.feedbackEnd'
                :min='toInputDate(new Date(new Date(eventToEdit.start!).getTime() - oneDay))' type='date'>
        </label>
        &nbsp;
        <DateFormat /><br>

        <details>
            <summary>
                <FormInput v-model="eventToEdit.form" :document="eventToEdit.formDocument" />
            </summary>

            <div class="mb-2 ml-2">
                <FormDocumentInput v-model="eventToEdit.formDocument" :form-url="eventToEdit.form" /><br>

                <label>Začátek přihlašování&ensp;<input
                    v-model.lazy='eventToEdit.applicationsStart'
                    type='date'></label>
                &nbsp;
                <DateFormat /><br>
                <label>Konec přihlašování&ensp;<input
                    v-model.lazy='eventToEdit.applicationsEnd'
                    :min='eventToEdit.applicationsStart!' type='date'></label>
                &nbsp;
                <DateFormat />
            </div>
        </details>

        <label for="participantSection" title="Uživatelé mohou zobrazit stav své přihlášky, skupinky a služby.">
            <Icon name="mdi:hail" /> Účastnická sekce
        </label>
        <input
            id="participantSection" v-model="eventToEdit.participantSection" type="checkbox"
            name="participantSection">

        <label for="transfers">
            <Icon name="mdi:leak" /> Povolit přenosy uživatelských dat
        </label>
        <input id="transfers" v-model="eventToEdit.transfers" type="checkbox" name="transfers">

        <br>
        <label for="advanced" title="Např. manuální synchronizace feedbacku a poznámek">
            <Icon name="mdi:account-settings" /> Povolit uživatelům pokročilá nastavení
        </label>
        <input id="advanced" v-model="eventToEdit.advanced" type="checkbox" name="advanced">

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
                        id="image-select" v-model="eventToEdit.imageIdentifier.type" type='radio'
                        name="imageSourceType" value="cloud" :disabled="!storage">
                    <label for="image-select">
                        <Icon name='mdi:folder-multiple-image' />
                    </label>
                </template>
                <input
                    id="image-url" v-model="eventToEdit.imageIdentifier.type" type='radio' name="imageSourceType"
                    value="external">
                <label for="image-url">
                    <Icon name='mdi:link' /> z existující URL
                </label>

                <StorageFileSelect
                    v-if='eventToEdit.imageIdentifier.type === "cloud"'
                    v-model='eventToEdit.imageIdentifier.data' />
                <fieldset v-else>
                    <legend>Externí URL</legend>
                    <input
                        v-model.lazy="imageExternalUrl" type="text" name="imageUrl"
                        placeholder="Existující URL nebo data:image/...">
                    <p>
                        <ProgressBar v-if="loadingImage" />
                        <img
                            v-else-if="eventToEdit.imageIdentifier.data" class="noinvert"
                            :src="eventToEdit.imageIdentifier.data" alt="Náhled" style="max-width: 100%">
                    </p>
                </fieldset>
            </div>
            <p v-if='files?.length === 1'>
                Soubor k nahrání: {{ files.item(0)!.name }}
            </p>

            <p>
                <label v-if='eventToEdit.imageIdentifier.type === "cloud"'>Výsledná lokace <input
                    v-model.lazy='eventToEdit.imageIdentifier.data' type='text'></label>
            </p>
        </details>

        <ClassicCKEditor v-model.lazy='eventToEdit.description' placeholder="Popis události" />

        <button type='submit' class="large">
            <Icon name="material-symbols:save" /> Uložit
        </button>
        <NuxtLink to="/admin/events">
            <button type="reset" class="large">
                <Icon name="mdi:cancel" /> Zrušit
            </button>
        </NuxtLink>
        <CustomError />
    </form>
    <article v-else>
        Nedostatečná oprávnění
    </article>
</template>
<script setup lang="ts">
import { stringify } from 'devalue'
import { slugify } from '@vueuse/motion'
import { useFileDialog } from '@vueuse/core'
import { ref as storageRef } from 'firebase/storage'
import { GoogleAuthProvider } from 'firebase/auth'
import { captureException } from '@sentry/nuxt'
import { arrayUnion, deleteField, doc, getDoc, type CollectionReference } from 'firebase/firestore'
import type { EventDescription, ScheduleDay } from '~/types/cloud'

definePageMeta({
    title: 'Úpravit akci',
    layout: 'admin',
    middleware: ['auth'],
})

const now = toFirebaseDate(new Date())!
const lang = useLang()

const config = useRuntimeConfig()
const router = useRouter()
const cloud = useCloudStore()

const selectedEventId = useSelectedEvent(router, config, true)
const selectedEvent = computed(() => {
    if (selectedEventId) {
        const event = cloud.eventsCollection.find(e => e.id == selectedEventId.value)
        if (event) {
            setTitle(event.title)
        }
        return event
    }
    return undefined
})
const editing = computed(() => !!selectedEventId.value)

const eventToEdit = ref({
    advanced: true,
    applicationsEnd: '',
    applicationsStart: '',
    title: '',
    description: '',
    end: now,
    form: '',
    formDocument: '',
    feedbackEnd: '',
    id: '',
    order: '',
    participantSection: true,
    imageIdentifier: {
        type: 'cloud',
        data: '',
    },
    showFrom: now,
    showTo: '',
    start: now,
    subtitle: '',
    tags: toRaw(cloud.filterTags),
    transfers: false,
    web: '',
})
watch(selectedEvent, selectedEvent => {
    if (selectedEvent) {
        eventToEdit.value = {
            advanced: selectedEvent.advanced ?? false,
            applicationsEnd: selectedEvent.applicationsEnd ?? '',
            applicationsStart: selectedEvent.applicationsStart ?? '',
            title: selectedEvent.title,
            description: selectedEvent.description,
            end: selectedEvent.end,
            form: selectedEvent.form ?? '',
            formDocument: selectedEvent.formDocument ?? '',
            feedbackEnd: selectedEvent.feedbackEnd ?? '',
            id: selectedEvent.id,
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
}, { immediate: true })

const customOrder = computed({
    get() {
        return !!eventToEdit.value.order
    },
    set(value: boolean) {
        if (value && !eventToEdit.value.order) {
            eventToEdit.value.order = eventToEdit.value.start
        } else if (!value) {
            eventToEdit.value.order = ''
        }
    },
})

//
// Tags
//


//
// Title
//

const sanitizeTitleAndId = computed({
    get() {
        return eventToEdit.value.title
    },
    set(changedValue: string) {
        const oldValue = eventToEdit.value.title
        if (changedValue !== oldValue) {
            if (eventToEdit.value.id === slugify(oldValue) && !editing.value) {
                eventToEdit.value.id = slugify(changedValue)
            }
        }
        eventToEdit.value.title = changedValue
    },
})

//
// Image
//
const loadingImage = ref(false)
const permittedTypes = ['png', 'jpg', 'jpe', 'web']
const imageExternalUrl = computed({
    get() {
        return eventToEdit.value.imageIdentifier.data
    },
    set(changedValue: string) {
        if (!changedValue) {
            eventToEdit.value.imageIdentifier.data = ''
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
                        eventToEdit.value.imageIdentifier.data = changedValue
                        return
                    }
                }
                alert('Odkaz na obrázek je neplatný')
            }).finally(() => {
                loadingImage.value = false
            })
        } else if (lower.startsWith('data:image/') && permittedTypes.includes(lower.substring(11, 14))) {
            eventToEdit.value.imageIdentifier.data = changedValue
        } else {
            alert('Odkaz na obrázek je neplatný')
        }
        eventToEdit.value.imageIdentifier = {
            type: 'external',
            data: changedValue,
        }
    },
})

const storage = cloud.probe && config.public.storageEnabled && useFirebaseStorage()
const fs = cloud.probe && useFirestore()
const ui = useUI()

const { files, open: openFD } = useFileDialog()
const remoteImage = useStorageFile(computed(() => storage && eventToEdit.value.id ? storageRef(storage, `${eventToEdit.value.id}/${files.value?.item(0)?.name ?? 'image'}`) : null))
function uploadImage() {
    const data = files.value?.item(0)
    if (data) {
        return remoteImage.upload(data)
    }
}

//
// Edit
//

const gapi = useGapi()
async function normalizeForms() {
    try {
        if (!eventToEdit.value.form) {
            eventToEdit.value.formDocument = ''
            return
        }
        const formDocUrlIsDoc = eventToEdit.value.formDocument.startsWith(registrationFormDocumentPrefix)
        const formUrlIsDoc = typeof extractFormIdFromURL(eventToEdit.value.form) != 'undefined'
        if (!eventToEdit.value.formDocument && !formUrlIsDoc && !formDocUrlIsDoc) {
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
            const id = extractFormIdFromURL(eventToEdit.value.formDocument)
            if (!id) {
                throw new Error(wrongURLError)
            }
            const result = await client.forms.forms.get({
                formId: id,
                fields: 'responderUri,info',
            })
            if (!eventToEdit.value.form.startsWith(registrationFormShortUrlPrefix)) {
                if (result.result.responderUri && result.result.info) {
                    if (eventToEdit.value.form != result.result.responderUri) {
                        if (confirm(`Zadaný odkaz na vyplnění přihlášky ${result.result.info.title} (${eventToEdit.value.form}) se liší od výchozí adresy uložené v dokumentu ${result.result.info.documentTitle} na Google Disku (${eventToEdit.value.formDocument}). ` +
                            '\nChcete ji přepsat adresou z dokumentu?',
                        )) {
                            eventToEdit.value.form = result.result.responderUri
                        }
                    }
                }
            }
        } else {
            const id = extractFormIdFromURL(eventToEdit.value.form)
            if (!id) {
                throw new Error(wrongURLError)
            }
            const result = await client.forms.forms.get({
                formId: id,
                fields: 'responderUri,info',
            })
            if (result.result.responderUri) {
                eventToEdit.value.formDocument = eventToEdit.value.form
                eventToEdit.value.form = result.result.responderUri
            }

        }
    } catch (e) {
        captureException(e)
        console.error(e)
        await ui.showIgnorableError('Nepodařilo se kontaktovat Google Formuláře: ' + (typeof e == 'object' ? ((e && 'result' in e) ? stringify(e.result) : e instanceof Error ? e.message : stringify(e)) : ' neznámá chyba'))
    }

}

async function editEvent(createNew = false) {
    using _ = ui.loading()
    if (files.value?.length) {
        await uploadImage()
        if (remoteImage.metadata.value) {
            eventToEdit.value.imageIdentifier = {
                type: 'cloud',
                data: remoteImage.metadata.value.fullPath,
            }
        }
    }
    if (!fs) {
        return
    }
    const docs = eventDocs(fs, eventToEdit.value.id)
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
                alert(`Kolekce '${key}'  k akci ${eventToEdit.value.id} již existuje`)
                return
            }
        }
    }

    // normalize application form URL
    eventToEdit.value.formDocument = eventToEdit.value.formDocument.trim()
    eventToEdit.value.form = eventToEdit.value.form.trim()
    if (config.public.featureForms) {
        await normalizeForms()
    }

    const end = new Date(eventToEdit.value.end)
    await setDoc(docs.event, {// create /events/[event-name]
        advanced: eventToEdit.value.advanced,
        applicationsEnd: toFirebaseDate(new Date(eventToEdit.value.applicationsEnd)) || deleteField(),
        applicationsStart: toFirebaseDate(new Date(eventToEdit.value.applicationsStart)) || deleteField(),
        title: eventToEdit.value.title,
        start: toFirebaseDate(new Date(eventToEdit.value.start)),
        end: toFirebaseDate(end),
        form: eventToEdit.value.form || deleteField(),
        formDocument: eventToEdit.value.formDocument || deleteField(),
        feedbackEnd: toFirebaseDate(new Date(eventToEdit.value.feedbackEnd)) || deleteField(),
        order: toFirebaseDate(new Date(eventToEdit.value.order)) || deleteField(),
        participantSection: eventToEdit.value.participantSection,
        description: eventToEdit.value.description,
        image: eventToEdit.value.imageIdentifier,
        showFrom: toFirebaseDate(new Date(eventToEdit.value.showFrom)) || deleteField(),
        showTo: toFirebaseDate(new Date(eventToEdit.value.showTo)) || deleteField(),
        subtitle: eventToEdit.value.subtitle,
        transfers: eventToEdit.value.transfers,
        tags: eventToEdit.value.tags,
        web: eventToEdit.value.web,
    } as EventDescription<void>, { merge: true })

    for (let i = new Date(eventToEdit.value.start); i <= end; i.setDate(i.getDate() + 1)) {
        const day = doc(docs.schedule, toFirebaseMonthDay(i))
        const dayContent = (await getDoc(day)).data() as ScheduleDay | undefined
        await setDoc(day, {
            cooking: null,
            date: toFirebaseDate(i),
            dishes: null,
            name: dayName(i, lang.value),
            program: arrayUnion(),
            manager: null,
            ...dayContent,
        }, { merge: true })
    }
    const dummies = [
        ...Object.keys(docs).filter(p => p != 'event').map(k => doc(docs[k as keyof typeof docs] as CollectionReference, 'dummy')),
        eventToEdit.value.transfers ? doc(knownCollection(fs, 'transfers'), 'dummy') : undefined,
    ]

    // Create subcollections
    await Promise.allSettled(dummies.map(d => d && setDoc(d, {}, { merge: true })))

    dummies.map(d => d && deleteDoc(d))

    router.push('/admin/events')
}


</script>
