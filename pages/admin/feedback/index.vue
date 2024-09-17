<template>
    <article>
        <h1>Nastavení zpětné vazby</h1>
        <p>
            <NuxtLink to="/admin/feedback/result">
                <button>
                    <Icon name="mdi:spreadsheet" />
                    Výsledky
                </button>
            </NuxtLink>
        </p>
        <button @click="csvExportAll">
            <Icon name="mdi:file-document-arrow-right" />
            CSV Export
        </button>
        <button @click="exportJson">
            <Icon name="mdi:export" />
            Export
        </button>
        <template v-if="cloud.resolvedPermissions.superAdmin">
            <form class="inline" @submit.prevent="importJson(); importing = false">
                <button type="button" @click="importing = !importing">
                    <Icon name="mdi:import" />
                    Import
                </button>
                <template v-if="importing">
                    <p>
                        <button type="button" @click="openFD()">
                            <Icon name="mdi:upload" />
                            Vybrat soubor
                        </button>
                        <button
                            type="button"
                            @click="importText ? null : (files?.item(0)?.text().then(t => t ? (importText = t) : null) ?? (importText = '')); reset()">
                            <Icon name="mdi:text-box-edit-outline" />
                            Vlastní text
                        </button>
                        <br>
                        <textarea
                            v-if="importText !== null" v-model="importText" :disabled="!!files?.length"
                            placeholder="Vložit z textu" />
                    </p>
                    <p>
                        <span v-show="files?.length === 1">Soubor k nahrání: {{ files?.item(0)?.name }} <br></span>
                        <input id="merge" v-model="merge" type="checkbox">
                        <label for="merge">Sloučit s existující částí</label>
                        <br>
                        <button>
                            <Icon name="mdi:flag" />
                            Potvrdit
                        </button>
                    </p>
                </template>
            </form>
        </template>
        <h2>Závěrečný dotazník</h2>
        <FeedbackConfig
            v-for="(_, index) in configCategoriesOrDefault" :key="`c${index}`" :index="index"
            :is-dummy="!cloud.feedback.config?.length" />
        <br>
        <button
            v-show="cloud.feedback.config?.length" title="Přidat sekci" type="button" @click="setDoc(cloud.eventDoc('feedbackConfig', configCategoriesOrDefault.length.toString()), {
            }, { merge: true })">+</button>

        <p>
            {{ error }}
        </p>
    </article>
</template>

<script setup lang="ts">
import { setDoc } from '~/utils/trace'
import { useCloudStore } from '~/stores/cloud'
import { doc } from 'firebase/firestore'
import { csvExport } from '~/utils/csvExport'
import type { FeedbackConfig } from '@/types/cloud'

definePageMeta({
    title: 'Zpětná vazba',
    layout: 'admin',
    middleware: ['auth'],
})

const cloud = useCloudStore()
const merge = ref(true)
const importing = ref(false)
const importText = ref<string | null>(null)
const error = ref()

function csvExportAll() {
    csvExport(cloud.selectedEvent ,error, cloud.feedback.online, cloud)
}

const configCategoriesOrDefault = computed<FeedbackConfig[]>(() => {
    if ((cloud.feedback.config?.length ?? 0) === 0) {
        return [{
            title: 'Sekce 1',
            individual: [],
        }]
    }
    return cloud.feedback.config!
})

function download(filename: string, text: string) {
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
    element.setAttribute('download', filename)

    element.style.display = 'none'
    document.body.appendChild(element)

    element.click()

    document.body.removeChild(element)
}

function exportJson() {
    download(`${cloud.selectedEvent}-feedback-${new Date().toLocaleString().replace(':', '-')}.json`, JSON.stringify(cloud.feedback.online))
}

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
        error.value = ''
        importText.value ||= await files?.value?.item(0)?.text() ?? ''
        if (!importText.value || !cloud.feedback.col) { return }
        const json = await JSON.parse(importText.value)
        for (const key in json) {
            setDoc(doc(cloud.feedback.col, key), json[key], { merge: merge.value })
        }
    } catch (e) {
        error.value = e
    }
}

</script>
