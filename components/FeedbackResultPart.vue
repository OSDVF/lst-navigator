<template>
    <div>
        <caption>{{ $props.schedulePart?.name }}</caption>
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
            <div v-if="admin.displayKind === 'histogram'" class="th">
                Histogram
            </div>
            <template v-else>
                <div v-for="respondent in tabulated.respondents" :key="respondent" class="th">
                    {{ respondent }}
                </div>
            </template>
        </header>
        <div class="scroll-x" @scroll="e => scrollX = (e.target as HTMLElement).scrollLeft">
            <table>
                <tbody ref="tableBody">
                    <template v-if="feedbackParts">
                        <template v-for="(replies, eIndex) in onlyIntIndexed(feedbackParts)" :key="`e${eIndex}td`">
                            <template
                                v-if="schedulePart?.program[eIndex].feedbackType && ['parallel', 'select'].includes(schedulePart.program[eIndex].feedbackType!)"
                            >
                                <caption>{{ schedulePart?.program[eIndex].title }}</caption>
                                <!-- Filtered by selected option -->
                                <tr
                                    v-for="(option, oIndex) in getParallelOrSelectEvents(schedulePart?.program[eIndex])"
                                    :key="`e${eIndex}o${oIndex}`"
                                >
                                    <td
                                        :set="filteredReplies = Object.fromEntries(Object.entries(replies).filter(([_rKey, r]) => r.select == option))"
                                    >
                                        <em>{{ option }} ({{ Object.keys(filteredReplies).length }})</em>
                                    </td>
                                    <template v-if="filteredReplies">
                                        <td>
                                            <FeedbackReply
                                                :reply="getAverage(filteredReplies)"
                                                :event="$props.schedulePart?.program?.[eIndex]"
                                            />
                                        </td>
                                        <FeedbackHistogramRow
                                            v-if="admin.displayKind === 'histogram'"
                                            :event="schedulePart?.program[eIndex]" :replies="filteredReplies"
                                        />
                                        <FeedbackIndividualRow
                                            v-else :event="schedulePart?.program[eIndex]"
                                            :replies="tabulated.replies[eIndex].map(r => r?.select === option ? r : null)"
                                            :respondents="tabulated.respondents"
                                            @set-data="(data: Feedback | null, user: string) => $props.onSetData!(data, eIndex.toString(), user)"
                                        />
                                    </template>
                                </tr>
                            </template>
                            <tr v-else-if="replies" :set="event = schedulePart?.program[eIndex]">
                                <td>
                                    <strong>
                                        {{ event?.title }}
                                    </strong>
                                    ({{ Object.keys(replies).length }})
                                </td>
                                <td>
                                    <FeedbackReply
                                        :reply="getAverage(replies)"
                                        :event="$props.schedulePart?.program?.[eIndex]"
                                    />
                                </td>
                                <FeedbackHistogramRow v-if="admin.displayKind === 'histogram'" :replies="replies" :event="event" />
                                <FeedbackIndividualRow
                                    v-else
                                    :event="event" :replies="tabulated.replies[eIndex]"
                                    :respondents="tabulated.respondents"
                                    @set-data="(data: Feedback | null, user: string) => $props.onSetData!(data, eIndex.toString(), user)"
                                />
                            </tr>
                        </template>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Feedback, ScheduleEvent, SchedulePart } from '@/types/cloud'
import { onlyIntIndexed } from '@/utils/types'
import { useAdmin } from '@/stores/admin'
import { useRespondents } from '@/stores/respondents'

const props = defineProps<{
    schedulePart?: SchedulePart,
    feedbackParts: Feedback[][], // firstly indexed by event, secondly by user
    onSetData?:(data: Feedback | null, eIndex: string, userIdentifier: string) => void
}>()

const admin = useAdmin()
const allRespondents = useRespondents()

const scrollX = ref(0)
const syncHeader = ref<HTMLElement>()
const tableBody = ref<HTMLElement>()

const tabulated = computed(() => {
    const seenRespondents: { [respondentId: string]: number } = {}
    const result: (Feedback | null)[][] = []
    let lastRespondentIndex = 0

    for (const feedbackPart of props.feedbackParts) {
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
        result.push(partRepliesByUser)
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

function getAverage(replies: Feedback[]) {
    const compl: { [index: string | number]: number } = {}
    const complCount: { [index: string | number]: number } = {}
    let basic = 0
    let basicCount = 0
    for (const rI in replies) {
        const r = replies[rI]
        if (r.basic) {
            basic += r.basic as number
            basicCount++
        }
        if (r.complicated) {
            for (const c in r.complicated) {
                if (r.complicated?.[c] !== null) {
                    if (!compl[c]) {
                        compl[c] = 0
                        complCount[c] = 0
                    }
                    compl[c] += r.complicated[c]!
                    complCount[c]++
                }
            }
        }
    }

    return {
        basic: basic / basicCount,
        complicated: Object.keys(compl).map(i => compl[i] / complCount[i])
    }
}

function getParallelOrSelectEvents(event: ScheduleEvent) {
    switch (event.feedbackType) {
    case 'select':
        return event.questions
    case 'parallel':
        return getParallelEvents(event)
    }
    return []
}

</script>
