<template>
    <article>
        <h1>Nastavení zpětné vazby</h1>
        <p>
            <NuxtLink to="/admin/feedback/result">
                <button class="large">
                    <Icon name="mdi:spreadsheet" />
                    Výsledky
                </button>
            </NuxtLink>
            <NuxtLink to="/feedback">
                <button class="large">
                    <Icon name="mdi:form-select" />
                    Dotazník
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
                            v-if="importText !== null" ref="textarea" v-model="importText" class="autosize"
                            :disabled="!!files?.length" placeholder="Vložit z textu" />
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
        <template v-if="cloud.resolvedPermissions.editEvent">
            <select value="" @change="e => { copyFrom(e.target as HTMLSelectElement) }">
                <option value="">Zkopírovat z akce...</option>
                <option
                    v-for="event in cloud.eventsCollection.filter(e => e.id != cloud.selectedEvent)" :key="event.id"
                    :value="event.id">
                    {{ event.title }}
                </option>
            </select>
            <EditableField
                class="p" description="Informace pro respondenty:" property="feedbackInfo"
                placeholder="Vyplňte všechno jako..." />
            <FeedbackConfig
                v-for="(_, index) in configCategoriesOrDefault" :key="`c${index}`" class="mb-2"
                :index="index" :is-dummy="!cloud.feedbackConfig?.length" />
            <br>
            <button
                v-show="cloud.feedbackConfig?.length" title="Přidat sekci" type="button" @click="setDoc(cloud.eventDoc('feedbackConfig', configCategoriesOrDefault.length.toString()), {
                }, { merge: true }).catch(e => error = e)">+
                <Icon name="mdi:selection" />
            </button>
            <LazyClientOnly>
                <template v-if="admin.feedbackConfigClipboard">
                    <button
                        type="button"
                        @click="setDoc(cloud.eventDoc('feedbackConfig', cloud.feedbackConfig?.length.toString() ?? '0'), admin.feedbackConfigClipboard).catch(e => error = e)">
                        <Icon name="mdi:clipboard-text" /> Vložit ze schránky
                    </button>
                    <button type="button" @click="admin.feedbackConfigClipboard = null">
                        <Icon name="mdi:clipboard-remove" /> Smazat schránku
                    </button>
                </template>
            </LazyClientOnly>
        </template>
        <p v-else>
            Nemáte práva na úpravu zpětné vazby.
        </p>
        <p>
            {{ error }}
        </p>
    </article>
</template>

<script setup lang="ts">
import { setDoc } from '~/utils/trace'
import { knownCollection, useCloudStore } from '~/stores/cloud'
import { collection, doc } from 'firebase/firestore'
import { csvExport } from '~/utils/csvExport'
import type { EventSubcollection, FeedbackConfig } from '@/types/cloud'
import { useAdmin } from '~/stores/admin'

const { textarea, input: importText } = useTextareaAutosize()
definePageMeta({
    title: 'Zpětná vazba',
    layout: 'admin',
    middleware: ['auth'],
})

const admin = useAdmin()
const cloud = useCloudStore()
const merge = ref(true)
const importing = ref(false)
const error = ref()

function csvExportAll() {
    csvExport(cloud.selectedEvent, error, cloud.feedback.online, cloud)
}

const configCategoriesOrDefault = computed<FeedbackConfig[]>(() => {
    if ((cloud.feedbackConfig?.length ?? 0) === 0) {
        return [{
            title: 'Sekce 1',
            individual: [],
        }]
    }
    return cloud.feedbackConfig!
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

async function copyFrom(target: HTMLSelectElement) {
    if (!target.value) { return }

    const other = useCollection<FeedbackConfig>(collection(knownCollection(useFirestore(), 'events'), target.value, 'feedbackConfig' as EventSubcollection), {
        wait: true,
        once: true,
    })
    await other.promise.value

    if (!other.value) { alert('Akce nebyla nalezena nebo má prázdný feedbackový formulář.'); return }
    if (confirm(`Opravdu chcete zkopírovat nastavení zpětné vazby z akce ${target.value}? Přepíšete tím současnou zpětnou vazbu.`)) {
        for (const part of other.value) {
            try {
                await setDoc(cloud.eventDoc('feedbackConfig', part.id), part, { merge: true })
            } catch (e) {
                error.value = e
                if (!confirm(`Nepodařilo se zkopírovat část ${part.id}. Chcete pokračovat?`)) { return }
            }
        }
    }
    target.value = ''
}

async function importJson() {
    try {
        error.value = ''
        importText.value ||= await files?.value?.item(0)?.text() ?? ''
        if (!importText.value || !cloud.feedback.col) { return }
        const json = await JSON.parse(importText.value)
        for (const key in json) {
            await setDoc(doc(cloud.feedback.col, key), json[key], { merge: merge.value })
        }
    } catch (e) {
        error.value = e
    }
}

</script>