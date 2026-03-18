<template>
    <SplitPage :split="showInfo">
        <template #header>
            <h1>Nastavení přihlášky</h1>
            <span class="button" @click="emit('edit')">
                <Icon name="mdi:pencil" />
            </span>
            <FormInput v-if="event" v-model="event!.form" disabled />
            <br>
            <FormDocumentInput v-if="event" v-model="event!.formDocument" disabled :form-url="event?.form" />

            <fieldset v-if="!internalSettings.secretsExist && !loading" class="p">
                <legend>
                    <Icon name="mdi:link-variant" /> Propojení přihlašovacího formuláře s aplikací
                </legend>
                <span v-if="synced" style="color:green">
                    <Icon name="mdi:check" />&nbsp;Synchronizováno
                </span>
                <template v-else-if="serviceAccountLoaded">
                    <button @click="sync().catch(e => error = e)">
                        <Icon name="mdi:sync" /> Synchronizovat
                    </button>&ensp;
                    <br>
                    <details>
                        <summary>Synchronizovat manuálně</summary>
                        <small>Pokud se nepodaří synchronizovat automaticky, <a
                            :href="event?.formDocument"
                            target="_blank" rel="noreferrer noopener">otevřete dokument s přihláškou pro úpravy</a>,
                            klikněte na menu
                            <Icon name="mdi:puzzle" />&rightarrow;"🔌 Propojit s aplikací" a zadejte tento kód:
                        </small>
                        <p>
                            <button
                                v-if="clipboard.isSupported" type="button"
                                @click="clipboard.copy().then(() => copied = true)">
                                <Icon name="mdi:content-copy" /> Kopírovat do schránky
                            </button>
                            {{ copied ? 'Kód zkopírován!' : '' }}
                            <textarea
                                readonly class="code" :value="JSON.stringify(connectCode)"
                                style="width: 100%;font-size: .8rem;" />
                        </p>
                    </details>
                </template>
                <template v-else>
                    <button type="button" @click="openFD()">
                        <Icon name="mdi:security" />&ensp;Nahrát přístupový soubor
                    </button>
                </template>
            </fieldset>
        </template>

        <main v-if="event && internalSettings.secretsExist" style="flex-grow:1">
            <details class="border mt-2">
                <summary>
                    <h3>
                        <Icon name="mdi:file-settings" /> Nastavení formuláře
                    </h3>
                </summary>
                <p>
                    <label>
                        <Icon name="mdi:human-edit" /> Účastníci mohou upravovat přihlášky&nbsp;
                        <input id="edit" v-model="canEdit" type="checkbox" name="edit">
                    </label>
                    <br>
                    <label>
                        <Icon name="mdi:email" /> Fromulář sbírá emaily&nbsp;
                        <select id="emails" v-model="formData.settings!.emailCollectionType" name="emails">
                            <option v-for="(desc, key) in emailCollectionTypes" :key="key" :value="key">{{ desc }}
                            </option>
                        </select>
                    </label>
                </p>
                <label title="Sem přijdou notifikace o tom, že se někdo přihlásil na akci">Email pro
                    notifikace&nbsp;<input
                        id="adminEmail" v-model="settings.adminEmail" type="text"
                        placeholder="iw@nttoknoweverything.com" name="adminEmail"></label><br>
            </details>


            <details ref="fields" class="border fields">
                <summary>
                    <h3>
                        <Icon name="mdi:form-textbox" /> Políčka
                    </h3>
                </summary>
                <p>
                    <small>Zadejte názvy otázek z formuláře, podle kterých budou přiřazeny data k jednotlivým
                        účastníkům.</small>
                </p>
                <label>Jméno&nbsp;
                    <FormItemSelect
                        id="name" v-model="settings.fields.name" type="text"
                        :placeholder="config.public.applicationDefaultNameField" name="name" :items="formQuestions" />
                </label><br>
                <label
                    v-if="!Object.keys(emailCollectionTypes).includes(formData.settings!.emailCollectionType ?? '')">Email&nbsp;
                    <FormItemSelect
                        id="email" v-model="settings.fields.email" :items="formQuestions" type="text"
                        :placeholder="config.public.applicationDefaultEmailField" name="email" />
                </label><br>
                <label>Kategorie účastníka&nbsp;
                    <FormItemSelect
                        id="category" v-model="settings.fields.category" :items="formQuestions" type="text"
                        :placeholder="config.public.applicationDefaultCategoryField" name="category" />
                </label><br>
                <label>Příjezd&nbsp;
                    <FormItemSelect
                        id="arrival" v-model="settings.fields.arrival" :items="formQuestions" type="text"
                        :placeholder="config.public.applicationDefaultArrivalField" name="arrival" />
                </label><br>
                <label>Odjezd&nbsp;
                    <FormItemSelect
                        id="departure" v-model="settings.fields.departure" :items="formQuestions"
                        type="text" :placeholder="config.public.applicationDefaultDepartureField" name="departure" />
                </label><br>
                <label>Další zakoupené položky&nbsp;
                    <FormItemSelect
                        id="extras" v-model="settings.fields.extras" :items="formQuestions" type="text"
                        :placeholder="config.public.applicationDefaultExtrasField" name="extras" />
                </label><br>
            </details>

            <details class="border">
                <summary>
                    <h3>
                        <Icon name="mdi:credit-card-outline" /> Platební údaje
                    </h3>
                </summary>
                <label>Číslo účtu&nbsp;<input
                    id="account" v-model="settings.accountNumber" type="text"
                    name="account"></label><br>
                <label>Kód banky&nbsp;<input id="bank" v-model="settings.bankCode" type="text" name="bank"></label><br>
                <label>Měna&nbsp;<input
                    id="currency" v-model="settings.currency" type="text" name="currency"
                    placeholder="CZK"></label><br>
                <label>
                    <FormTemplateIcon @click="showInfo = !showInfo" />&nbsp;
                    Šablona poznámky k platbě
                    <SimpleCode
                        id="message" v-model="settings.messageTemplate" placeholder="Přihláška XY"
                        name="message" language="html" />
                </label>&nbsp;
                <br>
                <label>
                    <FormTemplateIcon @click="showInfo = !showInfo" />&nbsp;
                    Šablona variabilního symbolu<br>
                    <SimpleCode
                        id="symbol"
                        v-model="settings.symbolTemplate" placeholder="37<?= new Date(timestampUTC).getDate() ?><?= new Date(timestampUTC).getMonth() ?>" name="symbol" language="html" />
                </label>
                <p>
                    <label for="price">
                        <Icon name="mdi:calculator" /> Výraz pro výpočet ceny (JS)
                    </label>
                    <SimpleCode
                        id="price" v-model="settings.priceExpression" class="mt-1" language="js"
                        placeholder="questionResponses.find(r => r.title == ...) // JS výraz, který vrací číslo" />
                </p>
                <details>
                    <summary>
                        <Icon name="mdi:cash-plus" /> Dobrovolné příspěvky
                    </summary>
                    <label for="donation">
                        <FormTemplateIcon @click="showInfo = !showInfo" />&nbsp;Výpočet dobrovolného příspěvku (JS)
                    </label>
                    <SimpleCode
                        id="donation" v-model="settings.donationExpression" language="js"
                        placeholder="questionResponses.find(r => r.title == ...) // JS výraz, který vrací číslo" />
                    <label>
                        <FormTemplateIcon @click="showInfo = !showInfo" />&nbsp;
                        Šablona variabilního symbolu pro dobrovolné příspěvky<br>
                        <SimpleCode
                            id="donationSymbol" v-model="settings.donationSymbolTemplate"
                            placeholder="42<?= new Date(timestampUTC).getDate() ?><?= new Date(timestampUTC).getMonth() ?>"
                            language="html" name="donationSymbol" />
                    </label>
                    <label>
                        <FormTemplateIcon @click="showInfo = !showInfo" />&nbsp;Šablona poznámky pro dobrovolné
                        příspěvky<br>
                        <SimpleCode
                            id="donationMessage" v-model="settings.donationMessageTemplate" language="html"
                            name="donationMessage" placeholder="Dar XY" />
                    </label>
                </details>
            </details>

            <details class="border">
                <summary>
                    <h3>
                        <Icon name="mdi:email-outline" /> Automatické emaily
                    </h3>
                </summary>
                <details>
                    <summary>Hlavička oznámení o přijetí přihlášky
                        <FormTemplateIcon @click.prevent="showInfo = !showInfo" />
                    </summary>
                    <SimpleCode
                        v-model="settings.emailHeadNew" language="html"
                        placeholder="Ahoj, účastníku, těší nás, že přijedeš na naši akci..." />
                </details>
                <details>
                    <summary>Hlavička oznámení o úpravě přihlášky
                        <FormTemplateIcon @click.prevent="showInfo = !showInfo" />
                    </summary>
                    <SimpleCode
                        v-model="settings.emailHeadEdited" language="html"
                        placeholder="Tvá přihláška byla úspěšně upravena..." />
                </details>
                <small>
                    <Icon name="mdi:information-outline" /> Mezi hlavičku a hlavním obsah bude vložena tabulka s
                    odpověďmi z
                    formuláře.
                </small>
                <details>
                    <summary>Hlavní obsah obou emailů
                        <FormTemplateIcon @click.prevent="showInfo = !showInfo" />
                    </summary>
                    <SimpleCode
                        v-model="settings.emailBody" language="html"
                        placeholder="Zaplatit můžeš na účet... Těšíme se na Tebe" />
                </details>
            </details>

            <p v-if="error">
                <code class="error">{{ error }}</code>
            </p>

            <p>
                <button type="button" @click="save().catch(e => error = e)">
                    <Icon name="mdi:check-all" /> Uložit
                </button>
                <button @click="emit('return')">
                    <Icon name="mdi:cancel" /> Zahodit změny
                </button>
            </p>
        </main>
        <p v-else-if="error">
            <code class="error">{{ error }}</code>
            <br>
            <br>
            <button @click="emit('return')">
                <Icon name="mdi:cancel" /> Zpět
            </button>
        </p>
        <FormTemplateInfo
            v-if="showInfo"
            :class="['top-0', ...(useWindowSize().width.value > 700 ? ['sticky'] : ['fixed', 'right-0', 'mw-50-vw'])]"
            style="z-index:1;max-height:100vh;overflow-y:auto;background: white;border-radius: 8px;"
            @close="showInfo = false" />
    </SplitPage>
</template>

<script setup lang="ts">
import { doc } from 'firebase/firestore'
import type { ApplicationFormSecrets } from '~/form-connector/src/settings'
import type { EventSettings } from '~/form-connector/src/types'
import type { ApplicationForm } from '~/types/cloud'
import { useApplicationForm } from '~/utils/applicationForm'
import { useDocument as useDocumentT } from '~/utils/trace'
import * as Sentry from '@sentry/nuxt'
import type { InternalSettingsResponse } from '~/form-connector/src/api'

type ServiceAccount = {
    type: 'service_account',
    client_email: string,
    private_key: string,
    project_id: string
}
const emailCollectionTypes = {
    VERIFIED: 'Jen pod Google doménou',
    RESPONDER_INPUT: 'Jakékoliv emaily',
}

const props = defineProps<{ eventId?: string }>()
const emit = defineEmits<{
    return: []
    edit: []
}>()
const fieldsElement = useTemplateRef<HTMLDetailsElement>('fields')

const cloud = useCloudStore()
const config = useRuntimeConfig()
const connectCode: ApplicationFormSecrets = {
    email: '',
    key: '',
    projectId: config.public.vuefire!.config!.projectId!,
    remoteEventSettings: `applications/${props.eventId}`,
}
const serviceAccountLoaded = ref(false)
const { open: openFD, onChange } = useFileDialog({
    accept: '.json',
    multiple: false,
})
onChange(async (files) => {
    try {
        if (files?.length) {
            const parsed = JSON.parse(await files[0].text()) as Partial<ServiceAccount>
            if (typeof parsed.type != 'string' || parsed.type != 'service_account' ||
                typeof parsed.project_id != 'string' || !parsed.project_id ||
                typeof parsed.private_key != 'string' || !parsed.private_key ||
                typeof parsed.client_email != 'string' || !parsed.client_email
            ) {
                error.value = 'Soubor má nesprávný formát'
                return
            }
            connectCode.email = parsed.client_email
            connectCode.projectId = parsed.project_id
            connectCode.key = parsed.private_key
            serviceAccountLoaded.value = true
        }
    } catch (e) {
        error.value = `Chyba ve zpracování souboru: ${e}`
    }
})
const clipboard = useClipboard({
    source: JSON.stringify(connectCode),
})
const copied = ref(false)
const error = ref()
const loading = inject<Ref<number>>('loading')!
const event = cloud.eventsCollection.find(e => e.id == props.eventId)
let id: string
if (!event) {
    error.value = 'Událost nevybrána'
}
else if (!event.formDocument) {
    error.value = 'Událost nemá zadanou adresu dokumentu přihlášky'
} else {
    id = extractFormIdFromURL(event.formDocument) ?? ''
    if (!id) {
        error.value = 'Událost nemá správně zadanou adresu dokumentu přihlášky. Je třeba zadat odkaz na sdílení upravitelného souboru na Google Disku.'
    }
}

const eventSettingsDoc = doc(useFirestore(), connectCode.remoteEventSettings)
const applFormApi = useApplicationForm()
const gapi = useGapi()
const client = await gapi.client()

const internalSettings = ref<InternalSettingsResponse>({//dummy value
    canEditResponse: false,
    secretsExist: false,
})
onMounted(async () => {
    loading.value++
    const response = await applFormApi.getInternal(id)
    if (response.ok && response.data) {
        internalSettings.value = response.data
    } else {
        Sentry.captureException(response.error)
        console.error(response.error)
        error.value = response.error?.message || response.error?.code || response.error?.http
    }
    loading.value--
})
const stop = watch(() => (internalSettings.value.secretsExist && loading.value == 0), l => {
    if (l) {
        nextTick(() => {
            if ((!Object.keys(emailCollectionTypes).includes(formData.value.settings?.emailCollectionType ?? '') && !settings.value.fields.email ||
                !settings.value.fields.name
            ) && fieldsElement.value) {
                fieldsElement.value.open = true
            }
        })
        stop()
    }
})
const canEdit = computed({
    get() {
        return internalSettings.value?.canEditResponse
    },
    set(value: boolean) {
        loading.value++
        applFormApi.setInternal(id, {
            canEditResponse: value,
        }).then(response => {
            if (response.ok) {
                internalSettings.value = {
                    ...toRaw(internalSettings.value),
                    canEditResponse: value,
                }
            } else {
                Sentry.captureException(response.error)
                console.error(response.error)
                error.value = response.error?.message || response.error?.code || response.error?.http
            }
        }).finally(() => loading.value--)
    },
})

const settings = ref<Omit<(EventSettings<string> & { fields: ApplicationForm['fields'] }), 'responsesCollection'>>({
    accountNumber: config.public.applicationDefaultAccount || '',
    adminEmail: '',
    bankCode: config.public.applicationDefaultBankCode || '',
    currency: config.public.applicationDefaultCurrency || 'CZK',
    donationExpression: '',
    donationMessageTemplate: '',
    donationSymbolTemplate: '',
    symbolTemplate: '',
    emailBody: '',
    emailHeadEdited: '',
    emailHeadNew: '',
    eventName: event?.title || '',
    extras: [],
    fields: {
        arrival: config.public.applicationDefaultArrivalField || '',
        category: config.public.applicationDefaultCategoryField || '',
        departure: config.public.applicationDefaultDepartureField || '',
        email: config.public.applicationDefaultEmailField || '',
        name: config.public.applicationDefaultNameField || '',
        extras: config.public.applicationDefaultExtrasField || '',
    },
    mainOrg: config.public.organizerEmail,
    messageTemplate: '',
    priceCategories: [],
    priceExpression: '',
    treatAllAsNew: false,
})
const showInfo = ref(false)

watch(useDocumentT(eventSettingsDoc, { once: true, wait: true }), doc => {
    if (doc) {
        Object.assign(settings.value, toRaw(doc))
    }
}, { immediate: true })

async function save() {
    loading.value++
    await setDoc(eventSettingsDoc, toRaw(settings.value), { merge: true })
    loading.value--
    emit('return')
}

const synced = ref(false)

async function sync() {
    loading.value++

    const response = await applFormApi.setSecrets(id, connectCode)
    if (response.ok) {
        error.value = undefined
        synced.value = true
    } else {
        error.value = 'Nepodařilo se synchronizovat s formulářem: ' + response.error?.message
        synced.value = false
    }
    loading.value--

    // TODO google picker api
    // TODO async encryption of SA
}

const _formData = ref<gapi.client.forms.Form>({//dummy value
    publishSettings: {
        publishState: {
            isAcceptingResponses: false,
            isPublished: false,
        },
    },
    items: [],
    linkedSheetId: '',
    settings: {
        emailCollectionType: 'RESPONDER_INPUT',
        quizSettings: {
            isQuiz: false,
        },
    },
    revisionId: undefined,
})
const wantedFields = 'settings/*,publishSettings/*,items/*,linkedSheetId,revisionId'
async function hydrateFormData() {
    const response = await client.forms.forms.get({
        formId: id,
        fields: wantedFields,
    })
    if ((response.status ?? 0) >= 400) {
        error.value = response.statusText
    }
    else {
        _formData.value = response.result
    }
}
onMounted(hydrateFormData)
const formData = computed({
    get() {
        return _formData.value
    },
    set(newValue: gapi.client.forms.Form) {
        loading.value++
        client.forms.forms.batchUpdate({
            formId: id,
            fields: wantedFields,
        }, {
            includeFormInResponse: true,
            requests: [
                ...(newValue.settings != _formData.value.settings ? [{
                    updateSettings: {
                        settings: newValue.settings,
                        updateMask: '*',
                    },
                }] as gapi.client.forms.Request[] : []),
            ],
            writeControl: {
                targetRevisionId: _formData.value.revisionId,
            },
        }).then(result => {
            if ((result.status ?? 0) >= 400 || !result.result.form) {
                error.value = result.statusText || 'Failed to retrieve form result'
            } else {
                _formData.value = result.result.form
            }
        }).finally(() => loading.value--)
    },
})
const formQuestions = computed(() => formData.value.items?.filter(i => (i.questionItem && i.title)) as { title: string, description?: string }[] | undefined)
</script>

<style lang="scss">
.fields {
    .multiselect {
        display: inline-block;
        width: auto;
    }
}
</style>