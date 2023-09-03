<template>
    <div class="p-1 feedbackResult">
        <h1>Části programu</h1>
        <div class="flex justify-content-between">
            <div>
                <label>
                    Druh zobrazení&ensp;
                    <select v-model="admin.displayKind">
                        <option v-for="k in Object.keys(displayKindOptionLabels)" :key="k" :value="k">
                            {{ displayKindOptionLabels[k as DisplayKind] }}
                        </option>
                    </select>
                </label>
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
                Počet respondentů: {{ respondents.names.size }} <button @click="showRespondents = true">
                    Vypsat
                </button>
                <br>
                <textarea
                    v-if="showRespondents" :rows="showRespondents ? respondents.names.size : 1" readonly
                    :value="showRespondents ? Array.from(respondents.names).join('\n') : ''"
                />
            </div>
            <div>
                <p>
                    <span style="color:blue">
                        &block;&block;
                    </span> &ensp; Celkový dojem
                </p>
                <p>
                    <span style="color:yellow">
                        &block;&block;
                    </span> &ensp; Detailní hodnocení
                </p>
                <p>
                    <span style="color:green">
                        &block;&block;
                    </span> &ensp; Výběr
                </p>
            </div>
        </div>
        <template v-if="typeof cloudStore.scheduleParts?.findLast(() => true) === 'string'">
            Načítání
        </template>
        <template v-else>
            <FeedbackResultPart
                v-for="key in Object.keys(programPartsFeedback)" :key="`p${key}`"
                :schedule-part="onlyIntIndexed(cloudStore.scheduleParts)[key as any]"
                :feedback-parts="onlyIntIndexed(programPartsFeedback[key as any])"
                @set-data="(data: Feedback | null, eIndex: string, user: string) => cloudStore.feedback.set(key, eIndex, data, user)"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import { Feedback, useCloudStore } from '@/stores/cloud'
import { onlyIntIndexed } from '@/utils/types'
import { DisplayKind, useAdmin } from '@/stores/admin'
import { useRespondents } from '@/stores/respondents'

definePageMeta({
    title: 'Výsledky zpětné vazby',
    layout: 'admin',
    middleware: ['auth']
})

const cloudStore = useCloudStore()
const admin = useAdmin()
const respondents = useRespondents()

const programPartsFeedback = computed(() => onlyIntIndexed(cloudStore.feedback.online as any[]))
const displayKindOptionLabels = {
    histogram: 'Histogram',
    individual: 'Individuální'
}
const showRespondents = ref(false)
</script>

<style lang="scss">
$border-color: rgba(128, 128, 128, 0.657);

.feedbackResult {
    table {
        border-collapse: separate;
        border-spacing: 0;
        margin-bottom: 1rem;

        &:nth-child(even) {
            background-color: rgba(128, 128, 128, 0.1);
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

    td:first-child {
        position: sticky;
        left: 0;
        background: white;
    }

    header {
        display: flex;
        position: sticky;
        top: 0;
        z-index: 1;

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
