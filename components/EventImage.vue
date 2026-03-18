<template>
    <RemoteImage
        v-if="eventImage" :src="eventImage" @click="p.lightbox ? ui.showLightBox(eventImage) : null"
        @load="saveCacheImage('eventImage-' + cloud.selectedEvent, $event)" />
</template>

<script setup lang="ts">
import { ref as storageRef } from 'firebase/storage'
import { doc } from 'firebase/firestore'
import type { EventDescription } from '~/types/cloud'
import { useDocument as useDocumentT } from '~/utils/trace'

const p = defineProps<{
    event: string,
    lightbox?: boolean
}>()

const config = useRuntimeConfig()
const cloud = useCloudStore()
const ui = useUI()
const firebaseStorage = cloud.probe && config.public.storageEnabled && useFirebaseStorage()
const eventDoc = cloud.eventsCollection.find(e => e.id == p.event)

const eventImage = computedAsync(async () => {
    const type = eventDoc?.image?.type
    let url: string | undefined
    if (type) {
        switch (type) {
        case 'cloud':
            if (firebaseStorage) {
                url = useStorageFileUrl(storageRef(firebaseStorage, eventDoc!.image!.data)).url.value ?? undefined
            }
            break
        case 'external':
            url = eventDoc!.image!.data
            break
        }
    }
    if (url) {
        return await getCacheImage('eventImage-' + p.event, url)
    }
    return url

}, null, { lazy: true })
</script>