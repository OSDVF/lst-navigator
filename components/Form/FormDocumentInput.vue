<template>
    <label
        v-if="show"
        title="URL souboru z Google Disku. Pro zadání tohoto pole je potřeba nejdříve zadat adresu samotné přihlášky.">
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
const show = computed(() => (formUrl && !formUrl.startsWith(applicationFormDocumentPrefix)) || model.value)
</script>