<template>
    <div
        :class="{
            'pl-2': true,
            'pr-2': true,
            'article': !split
        }">
        <h1>Nastavení zpětné vazby</h1>
        <p>
            <NuxtLink to="/admin/feedback/result">
                <button class="large">
                    <Icon name="mdi:spreadsheet" class="mb-0.5e" />
                    Výsledky
                </button>
            </NuxtLink>
            <NuxtLink to="/feedback">
                <button class="large">
                    <Icon name="mdi:form-select" class="mb-0.5e" />
                    Dotazník
                </button>
            </NuxtLink>
        </p>
        <button @click="csvExportAll">
            <Icon name="mdi:file-document-arrow-right" class="mb-0.5e" />
            CSV Export
        </button>
        <button @click="exportJson">
            <Icon name="mdi:export" class="mb-0.5e" />
            Export
        </button>
        <ImportForm
            v-if="cloud.resolvedPermissions.superAdmin && cloud.feedback.col" :collection="cloud.feedback.col"
            @error="e => error = e" />
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
                :parent-level="2" class="p" description="Informace pro respondenty:" property="feedbackInfo"
                placeholder="Vyplňte všechno jako..." />
            <div :class="split ? 'split' : ''">
                <main class="feedback">
                    <div v-show="largeScreen" style="float:right">
                        <input id="showPreview" v-model="showPreview" type="checkbox">
                        <label for="showPreview">
                            <Icon name="mdi:eye" class="mb-0.5e" /> Náhled harmonogramu
                        </label>
                    </div>
                    <h3>Sekce dotazníku</h3>
                    <FeedbackConfig
                        v-for="(_, index) in configCategoriesOrDefault" :key="`c${index}`"
                        :disabled="loading != 0" class="mb-2" :index="index" :is-dummy="!cloud.feedbackConfig?.length"
                        @begin-update="loading++" @end-update="loading--" />
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
                </main>
                <aside v-if="split" class="sticky top-0" style="max-height:100vh;overflow-y:auto">
                    <nav role="navigation" class="mb-1">
                        <a
                            v-for="(day, index) in cloud.days" :key="`day${index}`" :href="`#${index}`" :style="{
                                'backdrop-filter': index === previewDay ? 'brightness(0.8)' : undefined,
                            }" @click="previewDay = index">
                            {{ day?.name ?? index }}
                        </a>
                    </nav>
                    <LazyProgramSchedule :day="previewDay" />
                </aside>
            </div>
        </template>
        <p v-else>
            Nemáte práva na úpravu zpětné vazby.
        </p>
        <p>
            {{ error }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { setDoc, useCollection as useCollectionT } from '~/utils/trace'
import { knownCollection, useCloudStore } from '~/stores/cloud'
import { collection } from 'firebase/firestore'
import { csvExport } from '~/utils/csvExport'
import type { EventSubcollection, FeedbackConfig } from '@/types/cloud'
import { useAdmin } from '~/stores/admin'
import { download } from '~/utils/utils'


definePageMeta({
    title: 'Zpětná vazba',
    layout: 'admin',
    middleware: ['auth'],
})

const admin = useAdmin()
const cloud = useCloudStore()
const error = ref()
const loading = ref(0)
const previewDay = ref(parseInt(useRoute().hash) || 0)
const largeBreakpoint = 600
const largeScreen = ref(import.meta.browser && window.innerWidth > largeBreakpoint)
const showPreview = usePersistentRef('daysPreview', false)
const split = computed(() => showPreview.value && largeScreen.value)

onMounted(() => {
    window.addEventListener('resize', resize)
})
onUnmounted(() => {
    window.removeEventListener('resize', resize)
})

function resize() {
    largeScreen.value = window.innerWidth > largeBreakpoint
}

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

function exportJson() {
    download(`${cloud.selectedEvent}-feedback-${new Date().toLocaleString().replace(':', '-')}.json`, JSON.stringify(cloud.feedback.online))
}

async function copyFrom(target: HTMLSelectElement) {
    if (!target.value) { return }

    const other = useCollectionT<FeedbackConfig>(collection(knownCollection(useFirestore(), 'events'), target.value, 'feedbackConfig' as EventSubcollection), {
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


</script>

<style lang="scss">
.split {
    display: flex;
    gap: .5rem;
    align-items: start
}
</style>