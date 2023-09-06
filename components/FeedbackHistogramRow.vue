<template>
    <template v-if="event.feedbackType === 'complicated'">
        <td v-for="(q, qIndex) in (event.questions || defaultQuestions)" :key="`q${qIndex}`">
            <BarChart
                :values="getHistogram(Object.values(replies).map(r => typeof r?.complicated?.[qIndex] === 'number' ? r.complicated[qIndex] : null))"
                :min="0" :colors="complicatedColors[qIndex]" :categories="HISTOGRAM_BUCKETS" :labels="HISTOGRAM_BUCKETS"
            />
            {{ q }}
        </td>
    </template>
    <td v-else>
        <div>
            <BarChart
                :values="getHistogram(Object.values(replies).map(r => typeof r?.basic === 'number' ? r.basic : null))"
                :min="0" :colors="basicColors" :categories="HISTOGRAM_BUCKETS" :labels="HISTOGRAM_BUCKETS"
            />
            Celkový dojem
        </div>
    </td>
    <td colspan="100%">
        <table>
            <tbody>
                <tr v-for="detailReply in repliesWithDetails" :key="`d${detailReply.i}`">
                    <td>{{ detailReply.i }}</td><td>{{ detailReply.r.detail }}</td>
                </tr>
            </tbody>
        </table>
    </td>
</template>

<script setup lang="ts">
import randomcolor from 'randomcolor'
import { Feedback, ScheduleEvent } from '@/types/cloud'

const HISTOGRAM_BUCKETS = [1, 2, 3, 4, 5]
const basicColors = randomcolor({ count: 5, hue: 'blue' })
const hues = ['yellow', 'orange', 'red']
const complicatedColors = hues.map(hue => randomcolor({ count: 5, hue }))

const props = defineProps<{
    replies: {[respondent: string]: Feedback},
    event: ScheduleEvent
}>()

const repliesWithDetails = computed(() => {
    return Object.entries(props.replies).map(([i, r]) => ({ i, r })).filter(({ r }) => r.detail)
})

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
