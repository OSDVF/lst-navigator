<template>
    <form class="inline" @submit.prevent="importJson(); importing = false">
        <button type="button" @click="importing = !importing">
            <Icon name="mdi:import" />
            Import
        </button>
        <fieldset v-if="importing">
            <legend>Import</legend>
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
                    v-if="importText !== null" ref="textarea" v-model="importText" class="autosize w-full"
                    :disabled="!!files?.length" placeholder="Vložit z textu" />
            </div>
            <br>
            <div>
                <span v-show="files?.length === 1">Soubor k nahrání: {{ files?.item(0)?.name }} <br></span>
                <input id="merge" v-model="merge" type="checkbox">
                <label for="merge">Sloučit s existující částí</label>
                <br>
                <button>
                    <Icon name="mdi:flag" />
                    Potvrdit
                </button>
            </div>
        </fieldset>
    </form>
</template>

<script lang="ts" setup>
import { type CollectionReference, doc } from 'firebase/firestore'

const { textarea, input: importText } = useTextareaAutosize()
const importing = ref(false)
const merge = ref(true)

const p = defineProps<{
    collection?: CollectionReference,
}>()

const e = defineEmits<{
    error: [string | unknown],
    import: [any],
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
        e('import', json)
        if (p.collection) {
            for (const key in json) {
                await setDoc(doc(p.collection, key), json[key], { merge: merge.value })
            }
        }
    } catch (er) {
        e('error', er)
    }
}
</script>