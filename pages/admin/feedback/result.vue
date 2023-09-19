<template>
    <div>
        <nav>
            <NuxtLink to="/admin/feedback/result/program">
                Části programu
            </NuxtLink>
            <NuxtLink to="/admin/feedback/result/other">
                Ostatní otázky
            </NuxtLink>
        </nav>
        <div :class="'p-1 feedbackResult ' + admin.displayKind">
            <div class="flex flex-wrap justify-content-between p-1">
                <div>
                    <label>
                        Druh zobrazení&ensp;
                        <select v-model="admin.displayKind">
                            <option v-for="k in Object.keys(displayKindOptionLabels)" :key="k" :value="k">
                                {{ displayKindOptionLabels[k as DisplayKind] }}
                            </option>
                        </select>
                    </label>
                    <template v-if="admin.displayKind == 'individual'">
                        <template v-if="cloudStore.user.auth?.uid && cloudStore.resolvedPermissions.eventAdmin">
                            <br>
                            <button v-if="admin.editingFeedback" @click="admin.editingFeedback = false">
                                Úpravy
                                <IconCSS name="mdi:pencil" />
                            </button>
                            <button v-else @click="admin.editingFeedback = true">
                                Zobrazení
                                <IconCSS name="mdi:eye" />
                            </button>
                        </template>
                        <br>

                        Počet respondentů: {{ respondents.names.size }}
                        <button @click="showRespondents = true">
                            Vypsat
                        </button>
                        <br>
                        <textarea
                            v-if="showRespondents" :rows="showRespondents ? respondents.names.size : 1" readonly
                            :value="showRespondents ? Array.from(respondents.names).join('\n') : ''"
                        />
                    </template>
                </div>
                <div>
                    <button @click="csvExport">
                        <IconCSS name="mdi:file-excel" />
                        CSV Export
                    </button>
                </div>
                <div>
                    <span style="color:blue">
                        &block;&block;
                    </span> &ensp; Celkový dojem
                </div>
                <div>
                    <span style="color:yellow">
                        &block;&block;
                    </span> &ensp; Vícefázové hodnocení
                </div>
                <div>
                    <span style="color:orange">
                        &block;&block;
                    </span> &ensp; Otevřené odpovědi
                </div>
                <div>
                    <span style="color:green">
                        &block;&block;
                    </span> &ensp; Výběr
                </div>
            </div>
            <template v-if="typeof cloudStore.scheduleParts?.findLast(() => true) === 'string'">
                Načítání
            </template>
            <template v-else>
                <NuxtPage />
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import type * as ExportToCsv from 'export-to-csv'
import { useCloudStore } from '@/stores/cloud'
import { Feedback } from '@/types/cloud'
import { DisplayKind, useAdmin } from '@/stores/admin'
import { useRespondents } from '@/stores/respondents'

definePageMeta({
    title: 'Výsledky zpětné vazby',
    layout: 'admin',
    middleware: ['auth']
})

const router = useRouter()
onMounted(() => {
    if (!router.currentRoute.value.matched.find(r => r.name?.toString().startsWith('admin-feedback-result-'))) {
        // There is no loaded sub-page
        router.replace('/admin/feedback/result/program')
    }
})

const cloudStore = useCloudStore()
const admin = useAdmin()
const respondents = useRespondents()

const displayKindOptionLabels = {
    histogram: 'Histogram',
    individual: 'Individuální'
}
const showRespondents = ref(false)
let exportToCsv: null | typeof ExportToCsv = null
async function csvExport() {
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
                    const potentialTitle = cloudStore.scheduleParts[parseInt(partIndex)]?.program?.[parseInt(eventIndex)]?.title
                    if (potentialTitle) {
                        compoundIndex += `-${potentialTitle}`
                    }
                    byUserData[user][compoundIndex] = feedback
                    if (!compoundIndexes.includes(compoundIndex)) {
                        compoundIndexes.push(compoundIndex)
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
                userData[detailCol] = feedback.detail as string ?? ''
                if (feedback.detail && !compoundIndexesExpanded.includes(detailCol)) {
                    compoundIndexesExpanded.push(detailCol)
                }
                const selectCol = `${compoundIndex}-vyber`
                userData[selectCol] = feedback.select as string ?? ''
                if (feedback.select && !compoundIndexesExpanded.includes(selectCol)) {
                    compoundIndexesExpanded.push(selectCol)
                }
                const complicatedCols = [
                    `${compoundIndex}-otazka1`,
                    `${compoundIndex}-otazka2`,
                    `${compoundIndex}-otazka3`
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
        columnHeaders: ['user', ...compoundIndexesExpanded]
    })

    exportToCsv.download(csvConfig)(exportToCsv.generateCsv(csvConfig)(csvData))
}
</script>

<style lang="scss">
$border-color: rgba(128, 128, 128, 0.657);

@mixin left-sticky {
    position: sticky;
    left: 0;
    background: white;
    z-index: 1;
}

.feedbackResult {
    table {
        border-collapse: separate;
        border-spacing: 0;
        margin-bottom: 1rem;

        &:nth-child(even) {
            background-color: rgba(128, 128, 128, 0.1);
        }

        &>tbody>tr {
            &>td:first-child {
                @include left-sticky;
            }
        }
    }

    &.histogram {
        table>tbody>tr>td:last-child {
            min-width: 20rem
        }
    }

    td,
    th,
    .th {
        border-bottom: 1px solid $border-color;
        border-right: 1px solid $border-color;

        &>button {
            visibility: hidden;
        }

        &:hover,
        &:focus {
            &>button {
                visibility: visible;
            }
        }
    }

    header {
        display: flex;
        position: sticky;
        top: 0;
        z-index: 2;//To be above left-sticky elements

        .th {
            background: white;
            overflow-x: auto;
            overflow-y: hidden;
            flex-shrink: 0;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;

            &:not(:last-child) {
                border-right: 1px solid $border-color;
            }

            &:first-child {
                @include left-sticky; // TODO does not really get stuck
            }
        }
    }

    caption {
        display: block;
        width: 100%;
        font-size: 1.5rem;
        font-weight: bold;
        padding: .5rem;
        background-color: rgba(128, 128, 128, 0.2);
        border-top-left-radius: 1rem;
        border-top-right-radius: 1rem;
    }

    .bar-chart {
        height: 100px;
    }
}
</style>
