<template>
    <span class="flex align-items-center">
        <label v-if="show" :for="id" title="URL souboru s upravitelnou přihláškou na Google Disku" :class="['nowrap', labelClass]">
            Soubor s formulářem&ensp;
        </label>
        <input
            :id="id" ref="input" v-model.lazy="model" v-autowidth="{
                overflowParent: false,
                parentLevel: 2,
                watchWindowSize: true,
            }"
            :disabled="![registrationFormShortUrlPrefix, registrationFormDocumentPrefix].some(a => formUrl?.startsWith(a)) || disabled"
            type="url"
            :placeholder="formUrl?.startsWith(registrationFormDocumentPrefix) ? formUrl : 'https://docs.google.com/forms/...'"
            name="formDocument">
        &ensp;
        <Icon name="mdi:google-drive" />
        &ensp;
        <sup v-if="show" class="nowrap">
            <a rel="noreferrer noopener" target="_blank" :href="model" title="Otevřít v nové záložce">
                <template v-if="disabled">Otevřít&nbsp;</template>
                <Icon name="mdi:open-in-new" />
            </a>
        </sup>
    </span>
</template>

<script setup lang="ts">
const { formUrl, disabled, labelClass } = defineProps<{ formUrl?: string, disabled?: boolean, labelClass?: string }>()
const input = useTemplateRef<HTMLInputElement>('input')
defineExpose({ input })
const id = useId()

const model = defineModel<string>()
const dirty = ref(false)
watch(model, () => dirty.value = true)
const show = computed(() => (formUrl && !formUrl.startsWith(registrationFormDocumentPrefix)) || model.value || dirty.value)
</script>
