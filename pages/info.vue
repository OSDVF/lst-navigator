<template>
    <div>
        <img
            v-if="eventImage"
            class="eventImage"
            crossorigin="anonymous"
            :src="eventImage"
            @click="ui.showLightBox(eventImage)"
            @load="saveCacheImage('eventImage', $event)"
        >
        <h1>{{ cloudStore.eventTitle }}</h1>
        <h2>{{ cloudStore.eventSubtitle }}</h2>
    </div>
</template>

<script setup lang="ts">
import { computedAsync } from '@vueuse/core'
import { useCloudStore } from '@/stores/cloud'
import { useUI } from '@/stores/ui'
import { saveCacheImage } from '@/utils/imageCache'

const ui = useUI()

const cloudStore = useCloudStore()

const evaluating = ref(false)

const eventImage = computedAsync(async () => await getCacheImage('eventImage', cloudStore.eventImage), null, { lazy: true, evaluating })

definePageMeta({
    title: 'Informace'
})

</script>

<style lang="scss">
.eventImage {
    max-width: 600px;
}
</style>
