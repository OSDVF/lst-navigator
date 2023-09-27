<template>
    <div>
        <Teleport to="#topNav">
            <label class="p-1">
                <IconCSS name="mdi:magnify" /><button @click="zoomFactor += 0.1">
                    +
                </button><button @click="zoomFactor -= 0.1">
                    -
                </button><input
                    v-model="zoomFactor" min="0" max="5" step="0.1" :title="`${zoomFactor * 100}%`"
                    type="number" style="border:none;width: 7ex;display:inline"
                >
            </label>
            <label class="p-1">
                <IconCSS name="mdi:view-dashboard" /> Zobrazení&ensp;
                <select v-model="admin.displayKind">
                    <option v-for="k in Object.keys(displayKindOptionLabels)" :key="k" :value="k">
                        {{ displayKindOptionLabels[k as DisplayKind] }}
                    </option>
                </select>
            </label>
            <NuxtLink to="/admin/feedback/result/program" class="p-1 inline-block tab">
                <IconCSS name="mdi:calendar" />
                Části programu
            </NuxtLink>
            <NuxtLink to="/admin/feedback/result/other" class="p-1 inline-block tab">
                <IconCSS name="mdi:form-select" />
                Ostatní otázky
            </NuxtLink>
        </Teleport>
        <div :class="'p-1 feedbackResult ' + admin.displayKind">
            <div class="flex flex-wrap justify-content-between p-1">
                <div class="mr-1">
                    <template v-if="admin.displayKind == 'individual'">
                        <template v-if="cloudStore.user.auth?.uid && cloudStore.resolvedPermissions.editEvent">
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
                    <span style="color:blue">
                        &block;&block;
                    </span> &ensp; Celkový dojem
                </div>
                <div>
                    <span style="color:yellow">
                        &block;&block;
                    </span> &ensp; Vícesložkové hodnocení
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
                <NuxtPage :style="`font-size: ${zoomFactor}rem`" />
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'
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
const zoomFactor = ref(1)

const displayKindOptionLabels = {
    histogram: 'Histogram',
    individual: 'Individuální'
}

const showRespondents = ref(false)
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

        &>tbody>tr {
            &>td:first-child {
                @include left-sticky;
            }

            &:nth-child(even) {

                &>th,
                &>td {
                    background-color: rgba(128, 128, 128, 0.1);
                }
            }

            &.text, &.text td:first-child {
                background: #ffa6000d
            }
        }

        table {
            position: relative;
            z-index: 1;
            background: white;
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
        z-index: 2; //To be above left-sticky elements

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
        display: flex;
        justify-content: center;
        width: 100%;
        font-size: 1.5em;
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
