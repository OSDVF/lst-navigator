<template>
    <div>
        <img v-if="eventImage" :src="eventImage">
        <h1>{{ eventTitle }}</h1>
        <h2>{{ eventSubtitle }}</h2>
    </div>
</template>

<script setup lang="ts">
import { useStorageFileUrl } from 'vuefire'
import { ref as storageRef } from '@firebase/storage'
import { useCloudStore } from '@/stores/cloud'
const cloudStore = useCloudStore()

definePageMeta({
    title: 'Informace'
})

const metaDoc = useDocument(cloudStore.metaDocument)
const eventImage = computed(() => metaDoc.value?.image ? useStorageFileUrl(storageRef(cloudStore.firebaseStorage, metaDoc.value?.image)).url.value : null)
const eventTitle = computed(() => metaDoc.value?.title)
const eventSubtitle = computed(() => metaDoc.value?.subtitle)

</script>
