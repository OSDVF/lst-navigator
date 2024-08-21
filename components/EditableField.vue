<template>
    <div>
        <label v-if="cloudStore.resolvedPermissions.editSchedule" :for="key">
            &ensp;
            <strong>{{ props.description }}</strong>
            &nbsp;
            <input
                :value="value" type="text" :class="value ? 'editable' : ''" :name="key" @change="sendValue"
                @focus="permitSwipe = false" @blur="permitSwipe = true">
        </label>

        <strong v-else-if="value">&ensp;{{ props.description }} {{ value }}</strong>
        <template v-else>
            {{ props.empty ?? '' }}
        </template>
    </div>
</template>

<script setup lang="ts">
import { doc } from 'firebase/firestore'
import { setDoc } from '~/utils/trace'
import { knownCollection, useCloudStore } from '@/stores/cloud'
import { getCurrentInstance } from 'vue'

const props = defineProps<{
    document: string,
    description: string,
    empty?: string | null
    property: string,
    value?: any,
}>()

const vnodeKey = getCurrentInstance()?.vnode.key
const propKey = props.document + props.property
const key = typeof vnodeKey === 'symbol' ? propKey : vnodeKey?.toString() ?? propKey

const fs = useFirestore()
const cloudStore = useCloudStore()

const document = useDocument(doc(knownCollection(fs, 'events'), cloudStore.selectedEvent, props.document))
const value = computed(() => props.value ?? document.value?.[props.property])

function sendValue(event: Event) {
    const target = event.target as HTMLInputElement
    setDoc(doc(knownCollection(fs, 'events'), cloudStore.selectedEvent, props.document), { [props.property]: target.value }, { merge: true })
}

const permitSwipe = inject('permitSwipe', ref(false))
</script>