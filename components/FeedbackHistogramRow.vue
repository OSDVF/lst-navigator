<template>
    <template v-if="event.feedbackType === 'complicated'">
        <td v-for="(q, qIndex) in (event.questions || defaultQuestions)" :key="`e${eIndex}q${qIndex}`">
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
</template>

<script setup lang="ts">
import randomcolor from 'randomcolor'
import { Feedback } from '@/stores/cloud'

const HISTOGRAM_BUCKETS = [1, 2, 3, 4, 5]
const basicColors = randomcolor({ count: 5, hue: 'blue' })
const hues = ['yellow', 'orange', 'red']
const complicatedColors = hues.map(hue => randomcolor({ count: 5, hue }))

defineProps<{
    replies: Feedback[]
}>()


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
