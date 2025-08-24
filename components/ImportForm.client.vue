<template>
    <form class="inline" @submit.prevent="importJson(); importing = false">
        <button type="button" @click="importing = !importing">
            <Icon name="mdi:import" class="mr-0.5" />
            <slot>Import</slot>
        </button>
        <fieldset v-if="importing">
            <legend>
                <slot name="legend">Import</slot>
            </legend>
            <div>
                <button type="button" @click="openFD()">
                    <Icon name="mdi:upload" />
                    Vybrat soubor
                </button>
                <button
                    v-if="files?.length" type="button"
                    @click="importText ? null : (files?.item(0)?.text().then(t => t ? (importText = t) : null) ?? (importText = '')); reset()">
                    <Icon name="mdi:text-box-edit-outline" />
                    Vlastní text
                </button>
                <br>
                <textarea
                    v-if="importText !== null" ref="textarea" v-model="importText"
                    :class="{ autosize: !files?.length, 'w-full': true }" :disabled="!!files?.length"
                    :style="{ 'max-height': '100vh' }" placeholder="Vložit z textu" />
            </div>
            <br>
            <div>
                <span v-show="files?.length === 1">Soubor k nahrání: {{ files?.item(0)?.name }} <br></span>
                <p v-if="p.truncateOption ?? p.truncateDefault ?? true">
                    <input id="truncate" v-model="truncate" type="checkbox">
                    <label for="truncate">Smazat stávající data</label>
                </p>
                <button>
                    <Icon name="mdi:flag" />
                    Potvrdit
                </button>
                <template v-if="(truncate && truncateText) || (!truncate && mergeText)">
                    <br>
                    <Icon name="mdi:arrow-right" /> {{ truncate ? truncateText : mergeText }}
                </template>
            </div>
        </fieldset>
    </form>
</template>

<script lang="ts" setup>
import { arrayUnion, type CollectionReference, doc, type DocumentReference } from 'firebase/firestore'

const { textarea, input: importText } = useTextareaAutosize()
const importing = ref(false)

const p = defineProps<{
    collection?: CollectionReference,
    document?: DocumentReference,
    mergeText?: string,
    truncateDefault?: boolean,
    truncateOption?: boolean,
    truncateText?: string,
    union?: boolean,
}>()

const truncate = ref<boolean | undefined>(p.truncateDefault)

defineExpose({
    importing,
})

const e = defineEmits<{
    error: [string | unknown],
    import: [any, boolean],
}>()

const { files, open: openFD, onChange, reset } = useFileDialog({
    accept: '.json',
    multiple: false,
})

onChange(async (files) => {
    if (!files) { return }
    const file = files.item(0)
    if (!file) { return }
    importText.value = await file.text()
})


async function importJson() {
    try {
        e('error', null)
        importText.value ||= await files?.value?.item(0)?.text() ?? ''
        if (!importText.value) { return }
        const json = await JSON.parse(importText.value)
        if(p.union) {
            for(const key in json) {
                if(Array.isArray(json[key])) {
                    json[key] = arrayUnion(...json[key])
                }
            }
        }
        if (p.document) {
            await setDoc(p.document, json, { merge: !(truncate.value ?? p.truncateDefault) })
        } else if (p.collection) {
            for (const key in json) {
                await setDoc(doc(p.collection, key), json[key], { merge: !(truncate.value ?? p.truncateDefault) })
            }
        }
        e('import', json, !(truncate.value ?? p.truncateDefault))
    } catch (er) {
        e('error', er)
    }
}
</script>