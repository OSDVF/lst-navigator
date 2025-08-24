<template>
    <div>
        <slot
            v-if="cloudStore.resolvedPermissions.editSchedule" name="editable" :description="props.description"
            :send-value="sendValue" :value="valueOrValue">
            <label>
                &ensp;
                <strong>{{ props.description }}</strong>
                &nbsp;
                <Icon v-if="valueOrValue" name="mdi:pencil" />&nbsp;
                <input
                    v-autowidth="{
                        parentLevel: 3,
                        overflowParent: false,
                        comfortZone: '5px'
                    }" :value="valueOrValue" type="text" :class="(valueOrValue ?? true) ? 'editable' : ''"
                    :placeholder="props.placeholder ?? 'Prázdné'" @change="sendValue" @focus="permitSwipe = false"
                    @blur="permitSwipe = true">
            </label>
        </slot>

        <strong v-else-if="valueOrValue">
            <slot :description="props.description" :value="valueOrValue">&ensp;{{ props.description }} {{ valueOrValue
            }}</slot>
        </strong>
        <template v-else>
            {{ props.empty ?? '' }}
        </template>
    </div>
</template>

<script setup lang="ts">
import { setDoc, useDocument as useDocumentT } from '~/utils/trace'
import { useCloudStore } from '~/stores/cloud'

const props = defineProps<{
    document?: string,
    description?: string,
    empty?: string | null
    property: string,
    value?: any,
    placeholder?: string,
}>()

const cloudStore = useCloudStore()

const currentDoc = computed(() => cloudStore.probe ? props.document ? cloudStore.eventDoc(props.document) : cloudStore.eventDoc() : null)
const docData = useDocumentT<any>(currentDoc)
const valueOrValue = computed(() => props.value ?? docData.value?.[props.property])

async function sendValue(event: Event | string) {
    if (!currentDoc.value) { return }
    const target = typeof event === 'string' ? { value: event } : event.target as HTMLInputElement
    await setDoc(currentDoc.value, { [props.property]: target.value }, { merge: true })
}

const permitSwipe = inject('permitSwipe', ref(false))
</script>