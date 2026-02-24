<template>
    <RemoteImage
        v-if="eventImage" :src="eventImage" @click="ui.showLightBox(eventImage)"
        @load="saveCacheImage('eventImage-' + cloud.selectedEvent, $event)" />
</template>

<script setup lang="ts">
import { ref as storageRef } from 'firebase/storage'
import { doc } from 'firebase/firestore'
import type { EventDescription } from '~/types/cloud'
import { useDocument as useDocumentT } from '~/utils/trace'

const p = defineProps<{
    event: string
}>()
const config = useRuntimeConfig()
const cloud = useCloudStore()
const ui = useUI()
const firebaseStorage = cloud.probe && config.public.storageEnabled && useFirebaseStorage()
const firestore = cloud.probe && useFirestore()

const eventDocuments = useDocumentT<EventDescription<void>>(computed(() => firestore ? doc(firestore, 'events' as KnownCollectionName, p.event) : null), {
    maxRefDepth: 5,
    wait: true,
    once: true,
})

const eventImage = computedAsync(async () => await getCacheImage('eventImage-' + p.event,
    eventDocuments.value?.image.type == 'cloud' && firebaseStorage
        ? useStorageFileUrl(storageRef(firebaseStorage, eventDocuments.value?.image.data)).url.value
        : eventDocuments.value?.image.data,

), null, { lazy: true })
</script>