<template>
    <div>
        <caption>{{ $props.schedulePart?.name ?? $props.config?.name }}</caption>
        {{ $props.config?.description }}
        <header
            ref="syncHeader" :style="{
                transform: `translateX(${-scrollX}px)`
            }"
        >
            <div v-if="$props.schedulePart" class="th">
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
        <div class="scroll-x" @scroll="e => scrollX = (e.target as HTMLElement).scrollLeft">
            <table>
                <tbody ref="tableBody">
                    <template v-for="(replies, eIndex) in feedbackParts" :key="`e${eIndex}td`">
                        <SelectFeedbackRows
                            v-if="isSelect(eIndex)" :event="schedulePart?.program[eIndex as number]"
                            :replies="replies" :tabulated="tabulated.replies[eIndex]"
                            :respondents="tabulated.respondents"
                            :config="config"
                        />
                        <tr v-else-if="replies" :set="event = schedulePart?.program[eIndex as number]">
                            <td v-if="$props.schedulePart">
                                <strong>
                                    {{ event?.title }}
                                </strong>
                                ({{ Object.keys(replies).length }})
                            </td>
                            <td>
                                <FeedbackReply :reply="getAverage(replies)" :questions="(event ?? config)?.questions" />
                            </td>
                            <FeedbackHistogramRow
                                v-if="admin.displayKind === 'histogram'" :replies="replies"
                                :feedback-type="event?.feedbackType ?? config?.type"
                                :questions="(event ?? config)?.questions"
                            />
                            <FeedbackIndividualRow
                                v-else :event="event" :replies="tabulated.replies[eIndex]"
                                :respondents="tabulated.respondents"
                                @set-data="(data: Feedback | null, user: string) => $props.onSetData!(data, eIndex.toString(), user)"
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
import { getAverage } from '@/utils/types'

const props = defineProps<{
    schedulePart?: SchedulePart,
    config?: FeedbackConfig['individual'][0],
    feedbackParts: { [key: string | number]: { [user: string]: Feedback } }, // firstly indexed by event, secondly by user
    onSetData?:(data: Feedback | null, eIndex: string, userIdentifier: string) => void
}>()

const admin = useAdmin()
const allRespondents = useRespondents()

const scrollX = ref(0)
const syncHeader = ref<HTMLElement>()
const tableBody = ref<HTMLElement>()

function isSelect(eIndex: string | number) {
    const config = props.config?.type ?? props.schedulePart?.program[eIndex as number].feedbackType
    return (config) && ['parallel', 'select'].includes(config)
}

const tabulated = computed<TabulatedFeedback>(() => {
    const seenRespondents: { [respondentId: string]: number } = {}
    const result: TabulatedFeedback['replies'] = {}
    let lastRespondentIndex = 0

    for (const feedbackPartI in props.feedbackParts) {
        const feedbackPart = props.feedbackParts[feedbackPartI]
        const partRepliesByUser = Array<Feedback | null>(lastRespondentIndex + 1)
        for (const respondentName in feedbackPart) {
            const respondentIndex = seenRespondents[respondentName]
            if (typeof respondentIndex === 'undefined') {
                seenRespondents[respondentName] = lastRespondentIndex
                allRespondents.names.add(respondentName)
                partRepliesByUser[lastRespondentIndex] = feedbackPart[respondentName]
                lastRespondentIndex++
            } else {
                partRepliesByUser[respondentIndex] = feedbackPart[respondentName]
            }
        }
        result[feedbackPartI] = (partRepliesByUser)
    }

    // second pass fills in the gaps
    for (const i in result) {
        const feedbackPart = result[i]
        for (let i = 0; i < lastRespondentIndex; i++) {
            if (typeof feedbackPart[i] === 'undefined') {
                feedbackPart[i] = null
            }
        }
        result[i] = feedbackPart
    }
    return {
        replies: result,
        respondents: Object.keys(seenRespondents)
    }
})

function doSyncHeaders() {
    for (let i = 0; i < (syncHeader.value?.children?.length ?? 0); i++) {
        const headerElem = syncHeader.value?.children[i] as HTMLElement
        const cellElem = tableBody.value?.children[0]?.children[i] as HTMLElement
        if (typeof cellElem === 'undefined') {
            return
        }
        cellElem?.style.removeProperty('width')
        const cellWidth = parseFloat(getComputedStyle(cellElem).width)
        const headerWidth = parseFloat(getComputedStyle(headerElem).width)
        if ((cellElem?.clientWidth ?? 0) > 2) {
            headerElem.style.width = cellWidth + 'px'
        } else {
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

</script>
