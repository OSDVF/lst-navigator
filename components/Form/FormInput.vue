<template>
    <span class="inline-flex align-items-center" style="gap: 5px">
        <label v-if="title ?? true" for="form" title="URL Google Formuláře nebo jakýkoliv odkaz">
            <Icon name="mdi:form-select" style="color: #7346ba" class="noinvert" /> {{ typeof title == 'string' ? title
                : 'Formulář' }}
        </label>
        <template v-if="formData?.info?.title && model?.startsWith(registrationFormDocumentPrefix)">
            <NuxtLink
                style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
                class="inline-block dotted-underline" target="_blank" :href="model" title="Otevřít v nové záložce">
                {{ formData.info.title }}
                <sup>
                    <Icon name="mdi:open-in-new" />
                </sup>
            </NuxtLink>
            <span class="button" title="Vymazat" @click="model = ''; formData = undefined">
                <Icon name="mdi:close" />
            </span>
        </template>
        <input
            v-else id="form" v-model.lazy="model" v-autowidth title="URL Google Formuláře nebo jakýkoliv odkaz"
            :disabled="props.disabled" type="url" name="form" :placeholder="registrationFormShortUrlPrefix"
            @change="hydrateFormData().catch(catchHydrate)">

        <button v-if="!disabled" type="button" @click="usePicker">
            <Icon name="mdi:folder-google-drive" /> Vybrat z Disku
        </button>

        <template v-if="isFormDoc">
            <Icon
                title="Byla zadána adresa souboru na Google Disku. Uživatelům bude zobrazen odkaz na vyplnění přihlášky."
                name="mdi:google-drive" />

            <button v-if="!cloud.user.hasAdminScopes" type="button" @click="useGapi().adminReauth()">
                <Icon name="mdi:google" /> Udělit oprávnění
            </button>
        </template>
        <sup v-else-if="!formData?.info?.title && model">
            <a rel="noreferrer noopener" target="_blank" :href="model" title="Otevřít v nové záložce">
                <template v-if="disabled">Otevřít&nbsp;</template>
                <Icon name="mdi:open-in-new" />
            </a>
        </sup>
        <code v-if="error || cloud.user.error" class="error">Chyba: {{ error || cloud.user.error }}</code>
    </span>
</template>

<script lang="ts" setup>
import * as Sentry from '@sentry/nuxt'

const error = ref()
const model = defineModel<string>()
const props = defineProps<{
    disabled?: boolean,
    document?: string,
    title?: string | boolean,
}>()
const formData = ref<gapi.client.forms.Form>()

defineExpose({
    formData,
})

const cloud = useCloudStore()
const isFormDoc = computed(() => model.value?.startsWith(registrationFormDocumentPrefix))

async function usePicker() {
    const gapi = useGapi()
    const builder = await gapi.buildPicker()
    if (!builder) {
        return
    }
    const view = new google.picker.DocsView(google.picker.ViewId.FORMS)
    view.setMode(google.picker.DocsViewMode.LIST)
    const picker = builder
        .addView(view)
        .setMaxItems(1)
        .setCallback(result => {
            if (result[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
                const doc = result[google.picker.Response.DOCUMENTS]?.[0]
                if (doc) {
                    model.value = `${registrationFormDocumentPrefix}/${doc[google.picker.Document.ID]}/edit`
                }
            }
        }).build()
    picker.setVisible(true)
}
async function hydrateFormData(reauth = true) {
    if (!model.value || !cloud.user.adminAuth?.accessToken) {
        formData.value = undefined
        return
    }
    const formId = extractFormIdFromURL(model.value) ?? maybe(props.document, d => extractFormIdFromURL(d))
    if (!formId) {
        return
    }
    const gapi = useGapi()
    const client = await gapi.client(reauth)
    {
        const result = await client.forms.forms.get({
            formId,
            fields: 'info/*',
        })
        if ((result.status ?? 0) < 300) {
            formData.value = result.result
        }
    }
}
onMounted(() => hydrateFormData(false).catch(catchHydrate))

function catchHydrate(e: any) {
    if (e instanceof Error) {
        if (e.message == 'reauth') {
            return // Just wait for the user to click the button
        }
    }
    console.error('Failed to load form data', e)
    Sentry.captureException(e)
    error.value = (typeof e == 'object') ? (e.result?.error?.message || e) : e
}
</script>
