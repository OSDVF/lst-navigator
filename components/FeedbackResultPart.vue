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
                {{ $props.displayKind === 'histogram' ? 'Statistiky' : 'Průměr' }}
            </div>
            <div class="th">
                {{ $props.displayKind === 'histogram' ? 'Histogram' : 'Jednotlivé odpovědi' }}
            </div>
        </header>
        <div class="scroll-x" @scroll="e => scrollX = (e.target as HTMLElement).scrollLeft">
            <table>
                <tbody ref="tableBody">
                    <template v-if="feedbackParts">
                        <tr v-for="(event, eIndex) in onlyIntIndexed(feedbackParts)" :key="`e${eIndex}td`">
                            <td>
                                <strong>
                                    {{ $props.schedulePart?.program?.[eIndex]?.title }}
                                </strong>
                            </td>
                            <td>
                                <FeedbackReply :reply="getAverage(event)" :event="$props.schedulePart?.program?.[eIndex]" />
                            </td>
                            <template v-if="event">
                                <template v-if="$props.displayKind === 'individual'">
                                    <td v-for="rIndex in Object.keys(event)" :key="`e${eIndex}r${rIndex}`" :title="rIndex">
                                        <FeedbackReply
                                            :reply="event[rIndex as any]"
                                            :event="$props.schedulePart?.program?.[eIndex]"
                                        />
                                    </td>
                                </template>
                                <template v-else>
                                    <td v-if="schedulePart?.program[eIndex].feedbackType === 'basic'">
                                        <BarChart
                                            :values="getHistogram(Object.values(event).map(r => typeof r?.basic === 'number' ? r.basic : null))"
                                            :min="0"
                                        />
                                        Celkový dojem
                                    </td>
                                </template>
                            </template>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Feedback, SchedulePart } from '@/stores/cloud'
import { onlyIntIndexed } from '@/utils/types'

export type DisplayKind = 'histogram' | 'individual'
const RESOLUTION = 5

defineProps<{
    schedulePart?: SchedulePart,
    feedbackParts: Feedback[][], // firstly indexed by event, secondly by user
    displayKind: DisplayKind
}>()

const scrollX = ref(0)
const syncHeader = ref<HTMLElement>()
const tableBody = ref<HTMLElement>()

function doSyncHeaders() {
    for (let i = 0; i < (syncHeader.value?.children?.length ?? 0); i++) {
        const headerElem = syncHeader.value?.children[i] as HTMLElement
        const cellElem = tableBody.value?.children[0]?.children[i] as HTMLElement
        if (typeof cellElem === 'undefined') {
            return
        }
        cellElem?.style.removeProperty('width')
        if ((cellElem?.clientWidth ?? 0) > 2) {
            headerElem.style.width = (cellElem!.offsetWidth - parseFloat(getComputedStyle(headerElem.parentElement!).borderWidth.replace('px', '')) * 2) + 'px'
        } else {
            headerElem.style.removeProperty('width')
            cellElem.style.width = (headerElem?.clientWidth - parseFloat(getComputedStyle(cellElem).borderWidth.replace('px', '')) * 2) + 'px'
        }
    }
}

onMounted(() => {
    doSyncHeaders()
    window.addEventListener('resize', doSyncHeaders)
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
