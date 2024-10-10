<template>
    <div>
        <label v-if="cloudStore.resolvedPermissions.editSchedule">
            &ensp;
            <strong>{{ props.description }}</strong>
            &nbsp;
            <Icon v-if="valueOrValue" name="mdi:pencil" />
            <input
                v-autowidth :value="valueOrValue" type="text" :class="valueOrValue ? 'editable' : ''"
                :placeholder="props.placeholder ?? 'Prázdné'" @change="sendValue" @focus="permitSwipe = false"
                @blur="permitSwipe = true">
        </label>

        <strong v-else-if="valueOrValue">&ensp;{{ props.description }} {{ valueOrValue }}</strong>
        <template v-else>
            {{ props.empty ?? '' }}
        </template>
    </div>
</template>

<script setup lang="ts">
import { setDoc } from '~/utils/trace'
import { useCloudStore } from '~/stores/cloud'

const props = defineProps<{
    document?: string,
    description: string,
    empty?: string | null
    property: string,
    value?: any,
    placeholder?: string,
}>()

const cloudStore = useCloudStore()

const document = useDocument(props.document ? cloudStore.eventDoc(props.document) : cloudStore.eventDoc())
const valueOrValue = computed(() => props.value ?? document.value?.[props.property])

async function sendValue(event: Event) {
    const target = event.target as HTMLInputElement
    await setDoc(props.document ? cloudStore.eventDoc(props.document) : cloudStore.eventDoc(), { [props.property]: target.value }, { merge: true })
}

const permitSwipe = inject('permitSwipe', ref(false))
</script>