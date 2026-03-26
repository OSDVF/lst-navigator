<template>
    <SplitPage :split="showInfo">
        <template #header>
            <h1>Nastavení přihlášky</h1>
            <span class="button" @click="emit('edit')">
                <Icon name="mdi:pencil" />
            </span>
            <FormInput v-if="event" v-model="event!.form" disabled :document="event?.formDocument" />
            <br>
            <FormDocumentInput v-if="event" v-model="event!.formDocument" disabled :form-url="event?.form" />
            <ProgressBar v-if="ui.isLoading" />

            <fieldset v-if="!internalSettings.secretsExist && !ui.isLoading" class="p">
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
                        placeholder="iw@nttoknoweverything.com" name="adminEmail"
                        @update:model-value="dirty = true"></label><br>
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
                        :real="!!applications.settings.value?.fields.name"
                        :placeholder="config.public.applicationDefaultNameField" name="name" :items="formQuestions"
                        @update:model-value="dirty = true" />
                </label><br>
                <label
                    v-if="!Object.keys(emailCollectionTypes).includes(formData.settings!.emailCollectionType ?? '')">Email&nbsp;
                    <FormItemSelect
                        id="email" v-model="settings.fields.email" :items="formQuestions"
                        :real="!!applications.settings.value?.fields.email" placeholder="E-mail" name="email"
                        @update:model-value="dirty = true" />
                </label><br>
                <label>Telefon&nbsp;
                    <FormItemSelect
                        id="name" v-model="settings.fields.phone" type="text"
                        :real="!!applications.settings.value?.fields.phone"
                        :placeholder="config.public.applicationDefaultPhoneField" name="phone" :items="formQuestions"
                        @update:model-value="dirty = true" />
                </label><br>
                <label>Kategorie účastníka&nbsp;
                    <FormItemSelect
                        id="category" v-model="settings.fields.category" :items="formQuestions"
                        :real="!!applications.settings.value?.fields.category"
                        :placeholder="config.public.applicationDefaultCategoryField" name="category"
                        @update:model-value="dirty = true" />
                </label><br>
                <label>Příjezd&nbsp;
                    <FormItemSelect
                        id="arrival" v-model="settings.fields.arrival" :items="formQuestions"
                        :real="!!applications.settings.value?.fields.arrival"
                        :placeholder="config.public.applicationDefaultArrivalField" name="arrival"
                        @update:model-value="dirty = true" />
                </label><br>
                <label>Odjezd&nbsp;
                    <FormItemSelect
                        id="departure" v-model="settings.fields.departure" :items="formQuestions"
                        :real="!!applications.settings.value?.fields.departure" type="text"
                        :placeholder="config.public.applicationDefaultDepartureField" name="departure"
                        @update:model-value="dirty = true" />
                </label><br>
                <label>Další zakoupené položky&nbsp;
                    <FormItemSelect
                        id="extras" v-model="settings.fields.extras" :items="formQuestions"
                        :real="!!applications.settings.value?.fields.extras"
                        :placeholder="config.public.applicationDefaultExtrasField" name="extras"
                        @update:model-value="dirty = true" />
                </label><br>
                <label>První jídlo&nbsp;
                    <FormItemSelect
                        id="firstMeal" v-model="settings.fields.firstMeal" :items="formQuestions"
                        :real="!!applications.settings.value?.fields.firstMeal"
                        :placeholder="config.public.applicationDefaultFirstMealField" name="firstMeal"
                        @update:model-value="dirty = true" />
                </label><br>
                <label>Poslední jídlo&nbsp;
                    <FormItemSelect
                        id="lastMeal" v-model="settings.fields.lastMeal" :items="formQuestions"
                        :real="!!applications.settings.value?.fields.lastMeal"
                        :placeholder="config.public.applicationDefaultLastMealField" name="lastMeal"
                        @update:model-value="dirty = true" />
                </label><br>
                <label>Strava&nbsp;
                    <FormItemSelect
                        id="food" v-model="settings.fields.food" :items="formQuestions"
                        :real="!!applications.settings.value?.fields.food"
                        :placeholder="config.public.applicationDefaultFoodField" name="food"
                        @update:model-value="dirty = true" />
                </label><br>
                <h4>Názvy jídel ve dni</h4>
                <div
                    v-for="(_, index) in (settings.values.mealNames?.length ? settings.values.mealNames : [''])"
                    :key="`m${index}`">
                    <label>
                        {{ index + 1 }}. jídlo
                        &nbsp;
                        <FormItemSelect
                            v-model="settings.values.mealNames[index]" :searchable="false"
                            :real="!!applications.settings.value?.values.mealNames[index]" :items="mealNames"
                            :placeholder="config.public.applicationDefaultMealNames?.split(',').map(t => t.trim())[0] ?? 'Snídaně'"
                            @update:model-value="dirty = true" />
                    </label>
                    <span class="button" @click="settings.values.mealNames.splice(index, 1)">
                        <Icon name="mdi:trash-can" />
                    </span>
                    <span
                        class="button" @click="settings.values.mealNames = [
                            ...settings.values.mealNames.slice(0, index + 1),
                            '',
                            ...settings.values.mealNames.slice(index + 1),
                        ]">
                        <Icon name="mdi:plus" />
                    </span>
                    <br>
                </div>
            </details>

            <details class="border">
                <summary>
                    <h3>
                        <Icon name="mdi:credit-card-outline" /> Platební údaje
                    </h3>
                </summary>
                <label>Číslo účtu&nbsp;<input
                    id="account" v-model="settings.accountNumber" type="text" name="account"
                    @update:model-value="dirty = true"></label><br>
                <label>Kód banky&nbsp;<input id="bank" v-model="settings.bankCode" type="text" name="bank"></label><br>
                <label>Měna&nbsp;<input
                    id="currency" v-model="settings.currency" type="text" name="currency"
                    placeholder="CZK" @update:model-value="dirty = true"></label><br>
                <label>
                    <FormTemplateIcon @click="showInfo = !showInfo" />&nbsp;
                    Šablona poznámky k platbě
                    <SimpleCode
                        id="message" v-model="settings.messageTemplate" placeholder="Přihláška XY"
                        name="message" language="html" @update:model-value="dirty = true" />
                </label>&nbsp;
                <br>
                <label>
                    <FormTemplateIcon @click="showInfo = !showInfo" />&nbsp;
                    Šablona variabilního symbolu<br>
                    <SimpleCode
                        id="symbol" v-model="settings.symbolTemplate"
                        placeholder="37<?= new Date(timestampUTC).getDate() ?><?= new Date(timestampUTC).getMonth() ?>"
                        name="symbol" language="html" @update:model-value="dirty = true" />
                </label>
                <p>
                    <label for="price">
                        <Icon name="mdi:function-variant" /> Výraz pro výpočet ceny (JS)
                        <FormTemplateIcon @click="showInfo = !showInfo" />
                    </label>
                    <SimpleCode
                        id="price" v-model="settings.priceExpression" class="mt-1" language="js"
                        placeholder="questionResponses.find(r => r.title == ...) // JS výraz, který vrací číslo"
                        @update:model-value="dirty = true" />
                </p>
                <details>
                    <summary>
                        <Icon name="mdi:cash-plus" /> Dobrovolné příspěvky
                    </summary>
                    <label for="donation">
                        <Icon name="mdi:function-variant" />
                        Výpočet dobrovolného příspěvku (JS)
                        <FormTemplateIcon @click="showInfo = !showInfo" />
                    </label>
                    <SimpleCode
                        id="donation" v-model="settings.donationExpression" language="js"
                        placeholder="questionResponses.find(r => r.title == ...) // JS výraz, který vrací číslo"
                        @update:model-value="dirty = true" />
                    <label>
                        <FormTemplateIcon @click="showInfo = !showInfo" />&nbsp;
                        Šablona variabilního symbolu pro dobrovolné příspěvky<br>
                        <SimpleCode
                            id="donationSymbol" v-model="settings.donationSymbolTemplate"
                            placeholder="42<?= new Date(timestampUTC).getDate() ?><?= new Date(timestampUTC).getMonth() ?>"
                            language="html" name="donationSymbol" @update:model-value="dirty = true" />
                    </label>
                    <label>
                        <FormTemplateIcon @click="showInfo = !showInfo" />&nbsp;Šablona poznámky pro dobrovolné
                        příspěvky<br>
                        <SimpleCode
                            id="donationMessage" v-model="settings.donationMessageTemplate" language="html"
                            name="donationMessage" placeholder="Dar XY" @update:model-value="dirty = true" />
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
                        placeholder="Ahoj, účastníku, těší nás, že přijedeš na naši akci..."
                        @update:model-value="dirty = true" />
                </details>
                <details>
                    <summary>Hlavička oznámení o úpravě přihlášky
                        <FormTemplateIcon @click.prevent="showInfo = !showInfo" />
                    </summary>
                    <SimpleCode
                        v-model="settings.emailHeadEdited" language="html"
                        placeholder="Tvá přihláška byla úspěšně upravena..." @update:model-value="dirty = true" />
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
                        placeholder="Zaplatit můžeš na účet... Těšíme se na Tebe" @update:model-value="dirty = true" />
                </details>
            </details>

            <p v-if="error">
                <code class="error">{{ error }}</code>
            </p>

            <p>
                <button type="button" class="large" @click="save().catch(e => error = e)">
                    <Icon name="mdi:check-all" class="noinvert mb-0.5e" style="color:green" /> Uložit
                </button>
                <button class="large" @click="emit('return')">
                    <Icon name="mdi:cancel" class="mb-0.5e" /> Zahodit změny
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
            :class="['top-0', ...(windowSize.width.value > 700 ? ['sticky'] : ['fixed', 'right-0', 'mw-50-vw'])]"
            style="z-index:1;max-height:100vh;overflow-y:auto;background: white;border-radius: 8px;"
            @close="showInfo = false" />
    </SplitPage>
</template>

<script setup lang="ts">
import type { ApplicationFormSecrets } from '~/form-connector/src/settings'
import type { EventSettings } from '~/form-connector/src/types'
import type { ApplicationFormSettings } from '~/types/cloud'
import type { Responses } from '~/form-connector/src/api'
import { setDoc as setDocT } from '~/utils/trace'
import { doc } from 'firebase/firestore'
import { useApplicationForm, useApplicationFormData } from '~/utils/applicationForm'
import * as Sentry from '@sentry/nuxt'

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
const windowSize = useWindowSize()
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
const dirty = ref(false)
const error = ref()
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
const ui = useUI()

const internalSettings = ref<Responses['getInternal']>({//dummy value
    canEditResponse: false,
    secretsExist: false,
})
const warning = 'Opravdu chcete opustit tuto stránku? Neuložené změny budou ztraceny.'

function beforeunload() {
    if (dirty.value) {
        return warning
    }
}

onBeforeRouteLeave(() => {
    if (dirty.value) {
        return confirm(warning)
    }
})


onMounted(async () => {
    using _ = ui.loading()
    const response = await applFormApi.getInternal(id)
    if (response.ok && response.data) {
        internalSettings.value = response.data
    } else {
        Sentry.captureException(response.error)
        console.error(response.error)
        error.value = response.error?.message || response.error?.code || response.error?.http
    }
    window.addEventListener('beforeunload', beforeunload)
})

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', beforeunload)
})
const stop = watch(() => (internalSettings.value.secretsExist && !ui.isLoading), l => {
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
        ui.startLoading()
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
        }).finally(ui.stopLoading)
    },
})

const settings = ref<Omit<(EventSettings<string> & ApplicationFormSettings), 'responsesCollection'>>({
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
    values: {
        mealNames: config.public.applicationDefaultMealNames?.split(',').map(n => n.trim()) ?? [''],
    },
    fields: {
        arrival: config.public.applicationDefaultArrivalField || '',
        category: config.public.applicationDefaultCategoryField || '',
        departure: config.public.applicationDefaultDepartureField || '',
        firstMeal: config.public.applicationDefaultFirstMealField || '',
        lastMeal: config.public.applicationDefaultLastMealField || '',
        phone: config.public.applicationDefaultPhoneField || '',
        food: config.public.applicationDefaultFoodField || '',
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
const applications = storeToRefs(useApplications())
watch(applications.settings, doc => {
    if (doc) {
        assignDeepIfTruish(settings.value, toRaw(doc))
    }
}, { immediate: true })

async function save() {
    using _ = ui.loading()
    await setDocT(eventSettingsDoc, {
        ...toRaw(settings.value),
        responsesCollection: `applications/${cloud.selectedEvent}/responses`,
    } as EventSettings<string>, { merge: true })
    emit('return')
}

const synced = ref(false)

async function sync() {
    using _ = ui.loading()

    const response = await applFormApi.setSecrets(id, connectCode)
    if (response.ok) {
        error.value = undefined
        synced.value = true
    } else {
        error.value = 'Nepodařilo se synchronizovat s formulářem: ' + response.error?.message
        synced.value = false
    }

    // TODO async encryption of SA
}

const formData = await useApplicationFormData(id!, error)

const formQuestions = computed(() => formData.value.items?.filter(i => (i.questionItem && i.title)).map(i => ({
    id: parseInt(i.itemId ?? '', 16),
    description: i.description,
    title: i.title ?? '',
})))

const mealNames = computed(() => {
    const field = settings.value.fields.firstMeal ?? config.public.applicationDefaultFirstMealField
    return formData.value.items?.find(i => typeof field == 'number' ? parseInt(i.itemId!, 16) == field : i.title == field)?.questionItem?.question?.choiceQuestion?.options?.map((o, i) => ({
        id: i,
        title: o.value ?? '',
    }))
})
</script>

<style lang="scss">
.fields {
    .multiselect {
        display: inline-block;
        width: auto;
        min-width: 265px;
    }
}
</style>