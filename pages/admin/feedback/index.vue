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
        <button @click="csvExport">
            <Icon name="mdi:file-document-arrow-right" />
            CSV Export
        </button>
        <template v-if="cloudStore.resolvedPermissions.superAdmin">
            <button @click="exportJson">
                <Icon name="mdi:export" />
                Export
            </button>
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
                            @click="importText ? null : (files?.item(0)?.text().then(t => t ? (importText = t) : null) ?? (importText = ''));reset()"
                        >
                            <Icon name="mdi:text-box-edit-outline" />
                            Vlastní text
                        </button>
                        <br>
                        <textarea v-if="importText !== null" v-model="importText" :disabled="!!files?.length" placeholder="Vložit z textu" />
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
        <p>
            {{ error }}
        </p>
    </article>
</template>

<script setup lang="ts">
import type { FieldValue } from 'firebase/firestore';
import { setDoc } from '~/utils/trace'
import Lodash from 'lodash'
import { useCloudStore } from '~/stores/cloud'
import { doc } from 'firebase/firestore'
import type * as ExportToCsv from 'export-to-csv'
import type { Feedback } from '@/types/cloud'

definePageMeta({
    title: 'Zpětná vazba',
    layout: 'admin',
    middleware: ['auth'],
})

const cloudStore = useCloudStore()
const merge = ref(true)
const importing = ref(false)
const importText = ref<string | null>(null)
const error = ref()

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
    download(`${cloudStore.selectedEvent}-feedback-${new Date().toLocaleString().replace(':', '-')}.json`, JSON.stringify(cloudStore.feedback.online))
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
        if (!importText.value || !cloudStore.feedback.col) { return }
        const json = await JSON.parse(importText.value)
        for(const key in json) {
            setDoc(doc(cloudStore.feedback.col, key), json[key], { merge: merge.value })
        }
    } catch (e) {
        error.value = e
    }
}

function sanitize(str: string | FieldValue) {
    if (typeof str === 'object') {
        return ''
    }
    return str.replace('"', '\'')
        .replace(',', '，')
}
let exportToCsv: null | typeof ExportToCsv = null
async function csvExport() {
    try {
        error.value = ''
        if (!exportToCsv) {
            exportToCsv = await import('export-to-csv')
        }

        const csvData = []
        const compoundIndexes: string[] = []
        const byUserData: { [user: string]: { [compoundId: string]: Feedback } } = {}
        for (const partIndex in cloudStore.feedback.online) {
            const part = cloudStore.feedback.online[partIndex]
            if (typeof part === 'number' || part === null) { continue }
            for (const eventIndex in part) {
                const event = part[eventIndex]
                for (const user in event) {
                    const feedback = event[user] as Feedback | null
                    if (feedback?.basic || feedback?.detail || feedback?.select || feedback?.complicated?.find(c => !!c)) {
                        if (!byUserData[user]) {
                            byUserData[user] = {}
                        }
                        let compoundIndex = `${partIndex}-${eventIndex}`
                        const potentialTitle = cloudStore.days[parseInt(partIndex)]?.program?.[parseInt(eventIndex)]?.title
                        if (potentialTitle) {
                            compoundIndex += `-${potentialTitle}`
                        }
                        byUserData[user][compoundIndex] = feedback
                        if (!compoundIndexes.includes(compoundIndex)) {
                            compoundIndexes.push(compoundIndex)
                        }
                        const potentialInner = `${eventIndex}-0`
                        if (compoundIndexes.includes(potentialInner)) {
                            byUserData[user][compoundIndex] = Lodash.merge(byUserData[user][compoundIndex], byUserData[user][potentialInner])
                        }
                    }
                }
            }
        }

        const compoundIndexesExpanded: string[] = []
        for (const user in byUserData) {
            const userData: { [key: string]: boolean | string | number } = {}
            for (const compoundIndex of compoundIndexes) {
                const feedback = byUserData[user][compoundIndex]
                if (feedback) {
                    const basicCol = `${compoundIndex}-celkove`
                    userData[basicCol] = feedback.basic as number ?? ''
                    if (feedback.basic && !compoundIndexesExpanded.includes(basicCol)) {
                        compoundIndexesExpanded.push(basicCol)
                    }
                    const detailCol = `${compoundIndex}-detail`
                    userData[detailCol] = sanitize(feedback.detail as string ?? '')
                    if (feedback.detail && !compoundIndexesExpanded.includes(detailCol)) {
                        compoundIndexesExpanded.push(detailCol)
                    }
                    const selectCol = `${compoundIndex}-vyber`
                    userData[selectCol] = sanitize(feedback.select as string ?? '')
                    if (feedback.select && !compoundIndexesExpanded.includes(selectCol)) {
                        compoundIndexesExpanded.push(selectCol)
                    }
                    const complicatedCols = [
                        `${compoundIndex}-otazka1`,
                        `${compoundIndex}-otazka2`,
                        `${compoundIndex}-otazka3`,
                    ]
                    for (const col of complicatedCols) {
                        userData[col] = feedback.complicated?.[parseInt(col[col.length - 1]) - 1] as number ?? ''
                        if (feedback.complicated?.[parseInt(col[col.length - 1]) - 1] && !compoundIndexesExpanded.includes(col)) {
                            compoundIndexesExpanded.push(col)
                        }
                    }
                } else {
                    userData[`${compoundIndex}-celkove`] = ''
                    userData[`${compoundIndex}-detail`] = ''
                    userData[`${compoundIndex}-vyber`] = ''
                    userData[`${compoundIndex}-otazka1`] = ''
                    userData[`${compoundIndex}-otazka2`] = ''
                    userData[`${compoundIndex}-otazka3`] = ''
                }
            }

            csvData.push({ user, ...userData })
        }
        const csvConfig = exportToCsv.mkConfig({
            filename: `${cloudStore.selectedEvent}-feedback-${new Date().toLocaleString(navigator.language)}`,
            columnHeaders: ['user', ...compoundIndexesExpanded],
        })

        exportToCsv.download(csvConfig)(exportToCsv.generateCsv(csvConfig)(csvData))
    } catch (e) {
        error.value = e
    }
}
</script>
