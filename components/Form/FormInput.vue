<template>
    <span class="inline-flex align-items-center" style="gap: 5px">
        <label for="form" title="URL Google Formuláře nebo jakýkoliv odkaz">
            <Icon name="mdi:form-select" style="color: #7346ba" class="noinvert" /> Přihláška
        </label>
        <NuxtLink
            v-if="formData?.info?.title"
            style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
            class="inline-block dotted-underline" target="_blank" :href="model" title="Otevřít v nové záložce">{{ formData.info.title }}
            <sup>
                <Icon name="mdi:open-in-new" />
            </sup>
        </NuxtLink>
        <input
            v-else id="form" v-model.lazy="model" :disabled="props.disabled" type="url" name="form"
            :placeholder="applicationFormShortUrlPrefix">
        
        <button v-if="!disabled" type="button" @click="usePicker">
            <Icon name="mdi:folder-google-drive" /> Vybrat z Disku
        </button>
        
        <Icon
            v-if="isFormDoc"
            title="Byla zadána adresa souboru na Google Disku. Uživatelům bude zobrazen odkaz na vyplnění přihlášky."
            name="mdi:google-drive" />
        
        <button
            v-if="isFormDoc && !cloud.user.hasAdminScopes" type="button"
            @click="cloud.user.signIn(undefined, undefined, undefined, undefined, true)">
            <Icon name="mdi:google" /> Udělit oprávnění
        </button>
        <sup v-else-if="!formData?.info?.title">
            <a rel="noreferrer noopener" target="_blank" :href="model" title="Otevřít v nové záložce">
                <template v-if="disabled">Otevřít&nbsp;</template>
                <Icon name="mdi:open-in-new" />
            </a>
        </sup>
        <code v-if="cloud.user.error" class="error">{{ cloud.user.error }}</code>
    </span>
</template>

<script lang="ts" setup>
const model = defineModel<string>()
const props = defineProps<{
    disabled?: boolean,
    document?: string,
}>()
const formData = ref<gapi.client.forms.Form>()
const cloud = useCloudStore()
const isFormDoc = computed(() => model.value?.startsWith(applicationFormDocumentPrefix))

async function usePicker() {
    const gapi = useGapi()
    const builder = await gapi.buildPicker()
    if(!builder) {
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
                    model.value = `${applicationFormDocumentPrefix}/${doc[google.picker.Document.ID]}/edit`
                }
            }
        }).build()
    picker.setVisible(true)
}
async function hydrateFormData() {
    if (!model.value || !cloud.user.adminAuth?.accessToken) {
        return
    }
    const formId = extractFormIdFromURL(model.value) ?? maybe(props.document, d => extractFormIdFromURL(d))
    if (!formId) {
        return
    }
    const gapi = useGapi()
    const client = await gapi.client()
    const result = await client.forms.forms.get({
        formId,
        fields: 'info/*',
    })
    if ((result.status ?? 0) < 300) {
        formData.value = result.result
    }
}
onMounted(hydrateFormData)
watch(model, hydrateFormData)
</script>