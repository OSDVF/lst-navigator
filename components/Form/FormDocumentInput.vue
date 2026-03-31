<template>
    <label v-if="show" title="URL souboru s upravitelnou přihláškou na Google Disku">
        <Icon name="mdi:google-drive" /> Soubor s formulářem&ensp;
        <input
            id="formDocument" v-model.lazy="model"
            :disabled="![applicationFormShortUrlPrefix, applicationFormDocumentPrefix].some(a => formUrl?.startsWith(a)) || disabled"
            type="url"
            :placeholder="formUrl?.startsWith(applicationFormDocumentPrefix) ? formUrl : 'https://docs.google.com/forms/...'"
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
const model = defineModel<string>()
const dirty = ref(false)
watch(model, () => dirty.value = true)
const show = computed(() => (formUrl && !formUrl.startsWith(applicationFormDocumentPrefix)) || model.value || dirty.value)
</script>