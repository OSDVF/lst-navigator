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
            <div v-if="$props.displayKind === 'histogram'" class="th">
                Histogram
            </div>
            <template v-else>
                <div v-for="respondent in Object.keys(seenRespondents)" :key="respondent" class="th">
                    {{ respondent }}
                </div>
            </template>

        </header>
        <div class="scroll-x" @scroll="e => scrollX = (e.target as HTMLElement).scrollLeft">
            <table>
                <tbody ref="tableBody">
                    <template v-if="feedbackParts">
                        <template v-for="(replies, eIndex) in onlyIntIndexed(feedbackParts)" :key="`e${eIndex}td`">
                            <tr
                                v-if="replies"
                                :set="event = schedulePart?.program[eIndex]"
                            >
                                <td>
                                    <strong>
                                        {{ event?.title }}
                                    </strong>
                                </td>
                                <td>
                                    <FeedbackReply
                                        :reply="getAverage(replies)"
                                        :event="$props.schedulePart?.program?.[eIndex]"
                                    />
                                </td>
                                <template v-if="$props.displayKind === 'individual'">
                                    <td
                                        v-for="(reply, rIndex) in repliesTabulated[eIndex]" :key="`e${eIndex}r${rIndex}`"
                                    >
                                        <FeedbackReply :reply="reply" :event="event" />
                                    </td>
                                </template>
                                <template v-else>
                                    <template v-if="event.feedbackType === 'complicated'">
                                        <td
                                            v-for="(q, qIndex) in (event.questions || defaultQuestions)"
                                            :key="`e${eIndex}q${qIndex}`"
                                        >
                                            <BarChart
                                                :values="getHistogram(Object.values(replies).map(r => typeof r?.complicated?.[qIndex] === 'number' ? r.complicated[qIndex] : null))"
                                                :min="0" :colors="complicatedColors[qIndex]" :categories="HISTOGRAM_BUCKETS"
                                                :labels="HISTOGRAM_BUCKETS"
                                            />
                                            {{ q }}
                                        </td>
                                    </template>
                                    <td v-else>
                                        <BarChart
                                            :values="getHistogram(Object.values(replies).map(r => typeof r?.basic === 'number' ? r.basic : null))"
                                            :min="0" :colors="basicColors" :categories="HISTOGRAM_BUCKETS"
                                            :labels="HISTOGRAM_BUCKETS"
                                        />
                                        Celkový dojem
                                    </td>
                                </template>
                            </tr>
                        </template>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import randomcolor from 'randomcolor'
import { Feedback, SchedulePart, defaultQuestions } from '@/stores/cloud'
import { onlyIntIndexed } from '@/utils/types'

export type DisplayKind = 'histogram' | 'individual'
const HISTOGRAM_BUCKETS = [1, 2, 3, 4, 5]

const props = defineProps<{
    schedulePart?: SchedulePart,
    feedbackParts: Feedback[][], // firstly indexed by event, secondly by user
    displayKind: DisplayKind
}>()

const scrollX = ref(0)
const syncHeader = ref<HTMLElement>()
const tableBody = ref<HTMLElement>()
const basicColors = randomcolor({ count: 5, hue: 'blue' })
const hues = ['yellow', 'orange', 'red']
const complicatedColors = hues.map(hue => randomcolor({ count: 5, hue }))

const seenRespondents = ref<{ [respondentId: string]: number }>({})
const repliesTabulated = computed(() => {
    const result: (Feedback | null)[][] = []
    let lastRespondentIndex = 0

    for (const feedbackPart of props.feedbackParts) {
        const partRepliesByUser = Array<Feedback | null>(lastRespondentIndex + 1)
        for (const respondentId in feedbackPart) {
            const respondentIndex = seenRespondents.value[respondentId]
            if (typeof respondentIndex === 'undefined') {
                seenRespondents.value[respondentId] = lastRespondentIndex
                partRepliesByUser[lastRespondentIndex] = feedbackPart[respondentId]
                lastRespondentIndex++
            } else {
                partRepliesByUser[respondentIndex] = feedbackPart[respondentId]
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
    return result
})

function doSyncHeaders() {
    for (let i = 0; i < (syncHeader.value?.children?.length ?? 0); i++) {
        const headerElem = syncHeader.value?.children[i] as HTMLElement
        const cellElem = tableBody.value?.children[0]?.children[i] as HTMLElement
        if (typeof cellElem === 'undefined') {
            return
        }
        cellElem?.style.removeProperty('width')
        if ((cellElem?.clientWidth ?? 0) > 2) {
            headerElem.style.width = (cellElem!.offsetWidth) + 'px'
        } else {
            headerElem.style.removeProperty('width')
            cellElem.style.width = (headerElem?.offsetWidth) + 'px'
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

function getHistogram(replies: (number | null)[]) {
    const hist: number[] = []

    for (const r of replies) {
        if (r !== null) {
            if (!hist[r]) {
                hist[r] = 0
            }
            hist[r]++
        }
    }

    return hist
}

</script>
