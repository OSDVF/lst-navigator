<template>
    <LazyClientOnly>
        <Teleport to="#topNav">
            <label class="p-1">
                <Icon name="mdi:magnify" /><button @click="zoomFactor += 0.1">
                    +
                </button><button @click="zoomFactor -= 0.1">
                    -
                </button><input
                    v-model="zoomFactor" min="0" max="5" step="0.1" :title="`${zoomFactor * 100}%`"
                    type="number" style="border:none;width: 7ex;display:inline">
            </label>
            <SimpleSelect
                v-model="admin.displayKind" style="width: auto;" class="p-1" title="Zobrazení"
                :labels="displayKindOptions">
                <template #singleLabel="props">
                    <small class="sm-hide">&nbsp;{{ props.text }}</small>
                </template>
                <template #option="props">
                    &nbsp;<small>{{ props.text }}</small>
                </template>
            </SimpleSelect>
            <NuxtLink
                to="/admin/feedback/result/program" class="p-1 inline-flex align-items-center tab"
                title="Části programu">
                <Icon name="mdi:calendar" />
                <span class="sm-hide">Části programu</span>
            </NuxtLink>
            <NuxtLink
                to="/admin/feedback/result/other" class="p-1 inline-flex align-items-center tab"
                title="Ostatní otázky">
                <Icon name="mdi:form-select" />
                <span class="sm-hide">Ostatní otázky</span>
            </NuxtLink>
        </Teleport>
        <div :class="'p-1 feedbackResult ' + admin.displayKind">
            <div class="flex flex-wrap justify-content-between p-1">
                <div class="mr-1">
                    <template v-if="admin.displayKind == 'individual'">
                        <template v-if="cloudStore.user.auth?.uid && cloudStore.resolvedPermissions.editEvent">
                            <br>
                            <button v-if="admin.editingFeedback" @click="admin.setEditingFeedback(false)">
                                Úpravy
                                <Icon name="mdi:pencil" />
                            </button>
                            <button v-else @click="admin.setEditingFeedback(true)">
                                Zobrazení
                                <Icon name="mdi:eye" />
                            </button>
                        </template>
                        <br>

                        Počet respondentů: {{ respondents.names.size }}
                        <button @click="showRespondents = true">
                            Vypsat
                        </button>
                        <br>
                        <template v-if="showRespondents">
                            <div v-for="resp in respondents.names" :key="`r${resp}`">
                                {{ resp }}
                                <button title="Smazat respondenta" @click="deleteRespondent(resp)">
                                    <Icon name="mdi:trash-can" />
                                </button>
                            </div>
                        </template>
                    </template>
                    <div v-else>
                        <input id="anonymize" v-model="admin.anonymize" type="checkbox" name="anonymize"><label
                            for="anonymize">Plně anonymizovat</label>
                    </div>
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
            <template v-if="typeof cloudStore.days?.findLast(() => true) === 'string'">
                Načítání
            </template>
            <template v-else>
                <NuxtPage :style="`font-size: ${zoomFactor}rem`" />
            </template>
        </div>
    </LazyClientOnly>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'
import { useAdmin } from '@/stores/admin'
import { useRespondents } from '@/stores/respondents'

definePageMeta({
    title: 'Výsledky zpětné vazby',
    layout: 'admin',
    middleware: ['auth'],
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

const displayKindOptions = {
    histogram: {
        icon: 'mdi:chart-histogram',
        text: 'Histogram',
    },
    individual: {
        icon: 'mdi:list-status',
        text: 'Individuální',
    },
}

const showRespondents = ref(false)

function deleteRespondent(respondent: string) {
    if (confirm(`Opravdu chcete smazat odpovědi respondenta ${respondent}?`)) {
        if (cloudStore.feedback.online) {
            for (const section in cloudStore.feedback.online) {
                const sectionData = cloudStore.feedback.online[section]
                if (typeof sectionData !== 'number' && typeof sectionData !== 'string') {
                    for (const question in sectionData) {
                        if (sectionData[question]?.[respondent]) {
                            cloudStore.feedback.set(section, question, null, respondent)
                        }
                    }
                }
            }
            respondents.names.delete(respondent)
        }
    }
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

        &>tbody>tr {
            &>td:first-child {
                @include left-sticky;
            }

            &:nth-child(even) {

                &>th,
                &>td {
                    background-color: rgba(128, 128, 128, 0.1);

                    &:first-child {
                        background-color: rgb(233, 233, 233);
                    }
                }
            }

            &.text {
                background: #ffa6000d;

                td:first-child {
                    background: #fbf3e3;
                }
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

    .caption {
        width: 100%;
        font-size: 1.5em;
        font-weight: bold;
        padding: .5rem;
        background-color: rgba(128, 128, 128, 0.2);
        border-top-left-radius: 1rem;
        border-top-right-radius: 1rem;

        &.header {
            display: flex;
            justify-content: center;
        }
    }

    .bar-chart {
        height: 100px;
    }
}
</style>
