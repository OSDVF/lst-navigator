<template>
    <td v-if="feedbackType === 'complicated'">
        <span v-for="(q, qIndex) in (questions || defaultQuestions)" :key="`q${qIndex}`" class="inline-block border-between">
            <BarChart
                :values="getHistogram(Object.values(replies).map(r => typeof r?.complicated?.[qIndex] === 'number' ? r.complicated[qIndex] : null))"
                :min="0" :colors="complicatedColors[qIndex]" :categories="HISTOGRAM_BUCKETS" :labels="HISTOGRAM_BUCKETS"
            />
            {{ q }}
        </span>
    </td>
    <td v-else-if="feedbackType === 'text'">
        <div>
            <BarChart
                :values="clusteredTextIndexed" :min="0" :colors="randomcolor({ count: seenCategories.length, hue: 'orange' })"
                :categories="Object.keys(seenCategories)" :labels="seenCategories.map(c => c?.substring(0, 4))"
                :popups="Object.values(buckets).map(b=>Array.from(b).join('\n'))"
            />
            Podobné odpovědi
        </div>
    </td>
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
                    <td>{{ detailReply.i }}</td>
                    <td>{{ detailReply.r.detail }}</td>
                </tr>
            </tbody>
        </table>
    </td>
</template>

<script setup lang="ts">
import randomcolor from 'randomcolor'
import { metaphone } from 'metaphone'
import { Feedback, FeedbackType } from '@/types/cloud'
import { defaultQuestions } from '~/stores/cloud'

const HISTOGRAM_BUCKETS = [1, 2, 3, 4, 5]
const basicColors = randomcolor({ count: 5, hue: 'blue' })
const hues = ['yellow', 'orange', 'red']
const complicatedColors = hues.map(hue => randomcolor({ count: 5, hue }))

const props = defineProps<{
    replies: { [respondent: string]: Feedback },
    questions?: string[],
    feedbackType?: FeedbackType
}>()

const repliesWithDetails = computed(() => {
    return Object.entries(props.replies).map(([i, r]) => ({ i, r })).filter(({ r }) => r.detail)
})

function getHistogram(replies: (number | null)[]): number[] {
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

const seenCategories = ref<(string | null)[]>([])
const buckets = ref<{[key:string]:Set<string>}>({})
const clusteredTextIndexed = computed(() => {
    const indexed = Object.values(props.replies)
    const clustered = indexed.map(r => typeof r?.detail === 'string' ? metaphone(r.detail) : null)
    const result: number[] = []
    buckets.value = {}

    for (const ci in clustered) {
        const v = clustered[ci]
        let i = seenCategories.value.indexOf(v)
        if (i === -1) {
            i = seenCategories.value.length
        }
        seenCategories.value[i] = v
        result[i] = (result[i] ?? 0) + 1
        if (v) {
            if (buckets.value[v]) {
                buckets.value[v].add(indexed[ci].detail as string)
            } else {
                buckets.value[v] = new Set([indexed[ci].detail as string])
            }
        }
    }
    return result
})

</script>
