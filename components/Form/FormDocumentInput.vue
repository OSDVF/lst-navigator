<template>
    <label v-if="show" title="URL souboru s upravitelnou přihláškou na Google Disku">
        <Icon name="mdi:google-drive" /> Soubor s formulářem&ensp;
        <input
            id="formDocument" ref="input" v-model.lazy="model" v-autowidth="{
                overflowParent: false,
                parentLevel: 2,
                watchWindowSize: true,
            }"
            :disabled="![registrationFormShortUrlPrefix, registrationFormDocumentPrefix].some(a => formUrl?.startsWith(a)) || disabled"
            type="url"
            :placeholder="formUrl?.startsWith(registrationFormDocumentPrefix) ? formUrl : 'https://docs.google.com/forms/...'"
            name="formDocument">
    </label>
    &ensp;
    <sup v-if="show">
        <a rel="noreferrer noopener" target="_blank" :href="model" title="Otevřít v nové záložce">
            <template v-if="disabled">Otevřít&nbsp;</template>
            <Icon name="mdi:open-in-new" />
        </a>
    </sup>
</template>

<script setup lang="ts">
const { formUrl, disabled } = defineProps<{ formUrl?: string, disabled?: boolean }>()
const input = useTemplateRef<HTMLInputElement>('input')
defineExpose({ input })

const model = defineModel<string>()
const dirty = ref(false)
watch(model, () => dirty.value = true)
const show = computed(() => (formUrl && !formUrl.startsWith(registrationFormDocumentPrefix)) || model.value || dirty.value)
</script>
