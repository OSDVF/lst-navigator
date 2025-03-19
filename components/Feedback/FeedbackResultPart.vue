<template>
    <div>
        <div class="caption header">
            <span>{{ day?.name ?? props.config?.name }}</span>
            <span class="actions">
                <button title="CSV Export" @click="exportPart">
                    <Icon name="mdi:file-document-arrow-right" />
                </button>
            </span>
        </div>
        <code v-if="error" class="error" tabindex="0" title="Chyba">{{ error }}</code>
        <header
            ref="syncHeader" :style="{
                transform: `translateX(${-scrollX}px)`
            }">
            <div class="th">
                Název (odpovědí)
            </div>
            <div class="th">
                <strong>Průměr</strong>
            </div>
            <template v-if="admin.displayKind.value === 'histogram'">
                <div class="th">
                    Histogram
                </div>
                <div class="th">
                    Podrobná odpověď
                </div>
            </template>
            <template v-else>
                <div v-for="respondent in tabulated.respondents" :key="respondent" class="th">
                    {{ respondent }}
                    <button
                        title="Smazat respondentovy odpovědi v této kategorii"
                        @click.exact="deleteRespondentSection(respondent)"
                        @click.ctrl="deleteRespondentSection(respondent, true)">
                        <Icon name="mdi:trash-can" />
                    </button>
                </div>
            </template>
        </header>
        <div class="scroll-x" @scroll.passive="e => scrollX = (e.target as HTMLElement).scrollLeft">
            <table>
                <tbody ref="tableBody">
                    <template
                        v-for="(replies, eIndex) in (feedbackSection as FeedbackQuestionsCustom)"
                        :key="`e${eIndex}td`">
                        <SelectFeedbackRows
                            v-if="isSelect(eIndex)" :event="event?.[eIndex as number]"
                            :replies="replies" :tabulated="tabulated.replies[eIndex]"
                            :respondents="tabulated.respondents" :config="config?.config?.[eIndex]"
                            :link="makeLink?.(eIndex)"
                            @set-data="(data: Feedback | null, user: string) => $props.onSetData?.(data, eIndex as string, user)" />
                        <tr
                            v-else-if="replies && Object.keys(replies).length > 0"
                            :class="config?.config?.[eIndex]?.type">
                            <FeedbackCells
                                :config="config?.config?.[eIndex] ?? {
                                    name: eIndex as string,
                                    description: '(poškozená data)',
                                    questions: [],
                                }" :link="makeLink?.(eIndex)"
                                :tabulated="tabulated.replies[eIndex]" :respondents="tabulated.respondents"
                                :replies="replies" :event="event?.[eIndex as number]"
                                :on-set-data="(data: Feedback | null, user: string) => $props.onSetData?.(data, eIndex as string, user)" />
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useAdmin } from '@/stores/admin'
import { useRespondents } from '@/stores/respondents'
import { useCloudStore } from '@/stores/cloud'
import { csvExport } from '~/utils/csvExport'
import type { Feedback, FeedbackConfig, FeedbackQuestionsCustom, FeedbackQuestionsProgram, TabulatedFeedback } from '@/types/cloud'

const props = defineProps<{
    sectionKey: string | number,
    config?: { name: string, config: { [partName: string]: FeedbackConfig['individual'][0] } },
    feedbackSection: FeedbackQuestionsCustom | FeedbackQuestionsProgram, // firstly indexed by event, secondly by user
    onSetData?: (data: Feedback | null, eIndex: string, userIdentifier: string) => void
    makeLink?: (eIndex: string | number) => string
}>()

defineExpose({
    syncHeaders: doSyncHeaders,
})

const admin = storeToRefs(useAdmin())
const allRespondents = useRespondents()

const error = ref()
function exportPart() {
    csvExport(`${cloud.selectedEvent}-${props.sectionKey}`, error, { [props.sectionKey]: props.feedbackSection }, cloud)
}
const scrollX = ref(0)
const syncHeader = ref<HTMLElement>()
const tableBody = ref<HTMLElement>()

const day = computed(() => cloud.days[props.sectionKey as number])
const event = computed(() => day.value?.program)

function isSelect(eIndex: string | number) {
    const config = props.config?.config?.[eIndex]?.type ?? event.value?.[eIndex as number]?.feedbackType
    return (config) && ['parallel', 'select'].includes(config)
}

const tabulated = computed<TabulatedFeedback>(() => {
    const partRespondents = new Set<string>()
    const result: TabulatedFeedback['replies'] = {}

    // first pass finds respondents
    for (const feedbackPartI in props.feedbackSection) {// Need of explicit cast to supress errors, but it's safe
        const feedbackPart = (props.feedbackSection as FeedbackQuestionsCustom)[feedbackPartI]
        for (const respondentName in feedbackPart) {
            allRespondents.names.add(respondentName)
            partRespondents.add(respondentName)
        }
    }

    // second pass fills replies
    const resultRespondents = Array.from(partRespondents).sort()
    for (const feedbackPartI in props.feedbackSection) {
        const feedbackPart = (props.feedbackSection as FeedbackQuestionsCustom)[feedbackPartI]
        const repliesByUserIndex: TabulatedFeedback['replies'][''] = []
        for (const i in resultRespondents) {
            const respondent = resultRespondents[i]
            let respondentReply: Feedback | null = feedbackPart[respondent]
            if (!respondentReply) {
                respondentReply = null
            }
            repliesByUserIndex[i] = respondentReply
        }
        result[feedbackPartI] = repliesByUserIndex
    }
    return {
        replies: result,
        respondents: resultRespondents,
    }
})

function doSyncHeaders() {
    for (let i = 0; i < (syncHeader.value?.children?.length ?? 0); i++) {
        const headerElem = syncHeader.value?.children[i] as HTMLElement
        const rowsOrShit = Array.from(tableBody.value?.children ?? []) as HTMLElement[]
        const cellElem = rowsOrShit.find(c => c.tagName === 'TR')?.children[i] as HTMLElement
        if (typeof cellElem === 'undefined') {
            return
        }
        cellElem?.style.removeProperty('width')
        const cellWidth = parseFloat(getComputedStyle(cellElem).width)
        const headerWidth = parseFloat(getComputedStyle(headerElem).width)
        if ((cellElem?.clientWidth ?? 0) > 2) {
            headerElem.style.width = cellWidth + 'px'
        } else if (cellElem.children[0]) {
            headerElem.style?.removeProperty('width');
            (cellElem.children[0] as HTMLElement).style.width = headerWidth + 'px'
        }
    }
}

function deleteRespondentSection(respondent: string, force = false) {
    if (props.onSetData) {
        if (force || confirm('Opravdu chcete smazat odpovědi respondenta v této sekci?')) {
            for (const feedbackPartI in props.feedbackSection) {
                props.onSetData(null, feedbackPartI as string, respondent)
            }
        }
    } else {
        alert('No access to delete function')
    }
    allRespondents.names.delete(respondent)
}

onMounted(() => {
    doSyncHeaders()
    if (tableBody.value) {
        new ResizeObserver(doSyncHeaders).observe(tableBody.value)
    }
})

const cloud = useCloudStore()
let triggeredSync = false
cloud.feedback.watchFetching((loading, old) => {
    if (!loading && old && triggeredSync) {//loaded
        doSyncHeaders()
        triggeredSync = false
    }
})
watch(allRespondents.names, () => triggeredSync = true)

</script>

<style lang="scss">
.caption {
    .actions {
        visibility: hidden;
        padding-left: 1rem;
        display: flex;
    }

    &:hover,
    &:focus {
        .actions {
            visibility: visible;
        }
    }
}
</style>
