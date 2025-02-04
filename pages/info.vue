<template>
    <article role="article">
        <div class="eventBanner">
            <img
                v-if="eventImage" :crossorigin="cross ? 'anonymous' : undefined" class="eventImage" :src="eventImage"
                @click="ui.showLightBox(eventImage)"
                @load="saveCacheImage('eventImage-' + cloudStore.selectedEvent, $event)" @error="cross = false">
        </div>
        <h1>{{ cloudStore.eventData?.title }}<NuxtLink
            v-if="cloudStore.resolvedPermissions.editEvent" class="ml-2"
            to="/admin/events" title="Nastavení událostí">
            <button type="button" class="large">
                <Icon name="mdi:pencil" class="baseline" /> Upravit
            </button>
        </NuxtLink>
        </h1>
        <h2>{{ cloudStore.eventData?.subtitle }}</h2>
        <h6>
            <a :href="cloudStore.eventData?.web" target="_blank">
                <Icon mode="svg" name="mdi:link" size="1rem" style="rotate:45deg" />&ensp;Web: {{
                    cloudStore.eventData?.web }}
            </a>
            &ensp;
        </h6>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="text-invert" v-html="cloudStore.eventData?.description ?? 'Žádný popis'" />
    </article>
</template>

<script setup lang="ts">
import { computedAsync } from '@vueuse/core'
import { useCloudStore } from '@/stores/cloud'
import { useUI } from '@/stores/ui'
import { saveCacheImage } from '@/utils/imageCache'

const ui = useUI()

const cloudStore = useCloudStore()

const evaluating = ref(false)

const eventImage = computedAsync(async () => await getCacheImage('eventImage-' + cloudStore.selectedEvent, cloudStore.eventImage), null, { lazy: true, evaluating })
const cross = ref(true)

definePageMeta({
    title: 'Informace',
})

</script>

<style lang="scss">
.eventImage {
    object-fit: cover;
    max-width: 600px;
    display: block;
    margin: auto;
    border-radius: 8px;

    @media screen and (max-width: 600px) {
        max-width: 95%;
    }

    &:hover {
        cursor: pointer;
        filter: brightness(0.9);
    }
}

.eventBanner {
    max-height: 50vh;
    overflow: hidden;
    position: relative;

    &::after {
        content: '';
        height: 2rem;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgb(255, 255, 255) 100%);
        position: absolute;
        bottom: 0;
        z-index: 2;
        left: 0;
        right: 0;
    }
}
</style>
