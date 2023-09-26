<template>
    <div>
        <caption><span>{{ $props.schedulePart?.name ?? $props.config?.name }}</span>
            <div v-show="admin.displayKind === 'individual'" class="actions">
                <button title="CSV Export" @click="csvExport">
                    <IconCSS name="mdi:file-document-arrow-right" />
                </button>
            </div>
        </caption>
        <header
            ref="syncHeader" :style="{
                transform: `translateX(${-scrollX}px)`
            }"
        >
            <div class="th">
                Název
            </div>
            <div class="th">
                <strong>Průměr</strong>
            </div>
            <template v-if="admin.displayKind === 'histogram'">
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
                </div>
            </template>
        </header>
        <div class="scroll-x" @scroll.passive="e => scrollX = (e.target as HTMLElement).scrollLeft">
            <table>
                <tbody ref="tableBody">
                    <template v-for="(replies, eIndex) in feedbackParts" :key="`e${eIndex}td`">
                        <SelectFeedbackRows
                            v-if="isSelect(eIndex)" :event="schedulePart?.program[eIndex as number]"
                            :replies="replies" :tabulated="tabulated.replies[eIndex]" :respondents="tabulated.respondents"
                            :config="config?.config?.[eIndex]"
                            @set-data="(data: Feedback | null, user: string) => $props.onSetData?.(data, eIndex as string, user)"
                        />
                        <tr
                            v-else-if="replies && Object.keys(replies).length > 0"
                            :class="config?.config?.[eIndex].type"
                        >
                            <FeedbackCells
                                :config="config?.config?.[eIndex]" :make-link="makeLink ? (() => makeLink!(eIndex)) : undefined"
                                :tabulated="tabulated.replies[eIndex]" :respondents="tabulated.respondents"
                                :replies="replies" :event="schedulePart?.program[eIndex as number]"
                                :on-set-data="(data: Feedback | null, user: string) => $props.onSetData?.(data, eIndex as string, user)"
                            />
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Feedback, FeedbackConfig, SchedulePart, TabulatedFeedback } from '@/types/cloud'
import { useAdmin } from '@/stores/admin'
import { useRespondents } from '@/stores/respondents'

const props = defineProps<{
    schedulePart?: SchedulePart,
    config?: { name: string, config: { [partName: string]: FeedbackConfig['individual'][0] } },
    feedbackParts: { [key: string | number]: { [user: string]: Feedback } }, // firstly indexed by event, secondly by user
    onSetData?:(data: Feedback | null, eIndex: string, userIdentifier: string) => void
    makeLink?: (eIndex: string | number) => string
}>()

const admin = useAdmin()
const allRespondents = useRespondents()

const scrollX = ref(0)
const syncHeader = ref<HTMLElement>()
const tableBody = ref<HTMLElement>()

function isSelect(eIndex: string | number) {
    const config = props.config?.config?.[eIndex]?.type ?? props.schedulePart?.program[eIndex as number].feedbackType
    return (config) && ['parallel', 'select'].includes(config)
}

const tabulated = computed<TabulatedFeedback>(() => {
    const partRespondents = new Set<string>()
    const result: TabulatedFeedback['replies'] = {}

    // first pass finds respondents
    for (const feedbackPartI in props.feedbackParts) {
        const feedbackPart = props.feedbackParts[feedbackPartI]
        for (const respondentName in feedbackPart) {
            allRespondents.names.add(respondentName)
            partRespondents.add(respondentName)
        }
    }

    // second pass fills replies
    const resultRespondents = Array.from(partRespondents).sort()
    for (const feedbackPartI in props.feedbackParts) {
        const feedbackPart = props.feedbackParts[feedbackPartI]
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
        respondents: resultRespondents
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

onMounted(() => {
    doSyncHeaders()
    if (tableBody.value) {
        new ResizeObserver(doSyncHeaders).observe(tableBody.value)
    }
})

function csvExport() {

}

</script>

<style lang="scss">
caption {
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
