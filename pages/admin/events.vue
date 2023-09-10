<template>
    <article>
        <LazyDataTable :data="eventsIndexed">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Titulek</th>
                    <th>Začátek</th>
                    <th>Konec</th>
                </tr>
            </thead>
        </LazyDataTable>
    </article>
</template>

<script setup lang="ts">
import { useCloudStore } from '@/stores/cloud'
import { toJSDate } from '@/utils/types'

definePageMeta({
    title: 'Akce',
    layout: 'admin',
    middleware: ['auth']
})
const cloudStore = useCloudStore()
const lang = computed(() => process.client ? navigator.language : 'cs-CZ')

const eventsIndexed = computed(() => {
    const result = []
    if (cloudStore.eventsCollection) {
        for (const eventData of cloudStore.eventsCollection) {
            result.push([
                eventData.id,
                eventData.title,
                toJSDate(eventData.start)?.toLocaleDateString(lang.value),
                toJSDate(eventData.end)?.toLocaleDateString(lang.value)
            ])
        }
    }
    return result
})
</script>
