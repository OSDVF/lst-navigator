<template>
    <div class="bar-chart">
        <div v-for="(point, index) in gridPoints" :key="`p${index}`" class="grid">
            {{ point }}
        </div>
        <div
            v-for="(value, index) in normalizedValues" :key="index" class="bar"
            :style="{ '--value': `${value * 100}%`, '--count': normalizedValues.length, '--color': colors[index] }"
            :title="filteredValues[index]?.toString() ?? 'N/A'"
        >
            <span class="label">{{ labels[index] }}</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import randomcolor from 'randomcolor'

const props = defineProps<{
    values: {[key: number]: number},
    resolution?: number,
    labels?: string[],
    categories?: number[], // key of 'values' that will always be displayed no matter if there are no values for that key. Labels must be also supplied if categories are set
    colors?: string[],
    max?: number,
    min?: number
}>()

const filteredValues = computed(() => {
    const v = []
    const maximumKey = Math.max(...Object.keys(props.values).map(x => parseInt(x)), ...(props.categories ?? []))
    let minKey = Math.min(...Object.keys(props.values).map(x => parseInt(x)), ...(props.categories ?? []))
    if (!isFinite(minKey)) {
        minKey = 0
    }
    for (let i = minKey; i <= maximumKey; i++) {
        if (typeof props.values[i] === 'undefined' && props.categories?.includes(i)) {
            v.push(0)
        } else {
            v.push(props.values[i])
        }
    }
    return v
})

const max = computed(() => {
    if (typeof props.max !== 'undefined') {
        return props.max
    }
    const v = filteredValues.value

    let max = v[0] ?? 0
    for (let i = 1; i < v.length; i++) {
        if (v[i] > max) {
            max = v[i]
        }
    }
    return max
})

const min = computed(() => {
    if (typeof props.min !== 'undefined') {
        return props.min
    }
    const v = filteredValues.value

    let min = v[0] ?? 0
    for (let i = 1; i < v.length; i++) {
        if (v[i] < min) {
            min = v[i]
        }
    }
    return min
})

const range = computed(() => max.value - min.value)

const normalizedValues = computed(() => {
    return filteredValues.value.map(v => (v - min.value) / range.value)
})

const labels = computed(() => {
    if (typeof props.labels !== 'undefined') {
        return props.labels
    }
    return Object.keys(props.values)
})

const colors = computed(() => {
    if (typeof props.colors !== 'undefined') {
        return props.colors
    }
    return randomcolor({ count: filteredValues.value.length })
})

const gridPoints = computed(() => {
    const levels = []
    let level
    for (level = min.value; level <= max.value; level += (props.resolution ?? 1)) {
        levels.push(level)
    }
    if (level > max.value) {
        levels.push(level)
    }
})
</script>
<style lang="scss">
.bar-chart {
    &>.bar {
        height: 100%;
        width: calc(100% / var(--count));
        display: inline-flex;
        position: relative;
        align-items: flex-end;
        justify-content: center;

        &::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: var(--value);
            background-color: var(--color);
        }
    }
    .label {
        position: relative;//To appear before the chart
    }
}
</style>
