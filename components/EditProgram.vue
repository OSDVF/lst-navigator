<template>
    <div>
        <label for="title">
            <Icon name="mdi:timeline-alert" />&ensp; Titulek*
        </label>&ensp;
        <input
            id="title" v-model="editedEvent.title" type="text" name="title" placeholder="např. Večerní program"
            required>

        <p>
            <label for="subtitle">
                <Icon name="mdi:timeline-text-outline" />&ensp; Podtitulek
            </label>&ensp;
            <input
                id="subtitle" v-model="editedEvent.subtitle" type="text" name="subtitle"
                placeholder="např. Hra v týmech">
            <br>
            <small>Názvy paralelních programů oddělte v <strong>podtitulku</strong> čárkou: <em>Frisbee (Tom), Relax
                (Kaba), ...</em></small>
        </p>

        <br>
        <label for="time">
            <Icon name="mdi:timeline-clock-outline" />&ensp; Čas*
        </label>&ensp;
        <input
            id="time" :value="isNaN(editedEvent.time ?? NaN) ? '' : editedEvent.time" type="text" name="time"
            placeholder="HMM" required
            @input="(e) => editedEvent.time = parseInt((e.target as HTMLInputElement).value.replace(/[^0-9]/g, ''))">
        <br><small>{{ editedEvent.time ? `Bude zobrazeno ${toHumanTime(editedEvent.time)}` : "Např. 730 = 7:30"
        }}</small>

        <br>
        <p>
            <label for="color">
                <Icon name="mdi:palette" />&ensp; Barva
            </label>&ensp;
            <input id="color" v-model="editedEvent.color" type="text" name="color">&ensp;
            <input v-model="colorHex" type="color">&ensp;<span
                :style="`background: ${editedEvent.color}`"
                title="Test barvy" class="inline-block p-1">DAY</span>
            <span :style="`background: ${colorOrWhite};filter:invert(1)`" class="inline-block p-1">NIGHT</span>
            &ensp;<button type="button" @click="editedEvent.color = ''">Vymazat</button>

        </p>
        <div class="flex-center">
            <label class="nowrap" for="icon">
                <Icon name="mdi:shape" />&ensp; Ikona
            </label>&ensp;
            <input v-model="editedEvent.icon" type="hidden" name="icon">
            <IconSelect id="icon" v-model="editedEvent.icon" />
        </div>
        <br>

        <label for="description">
            <Icon name="mdi:text" />&ensp; Dlouhý popis
        </label>&ensp;
        <ClientOnly>
            <ckeditor
                v-if="ClassicEditor" id="description" v-model.lazy="editedEvent.description"
                :editor="ClassicEditor" />
        </ClientOnly>
        <input v-model.lazy="editedEvent.description" type="hidden" name="description">

        <br>
        <fieldset>
            <legend>
                <Icon name="mdi:rss" />&ensp; Nastavení feedbacku
            </legend>

            <FeedbackTypeSelect
                id="feedbackType" :type="feedbackOrDefault" :permit-empty="true"
                :event="editedEvent"
                :detail-question="editedEvent.detailQuestion" 
                :questions="editedEvent.questions"
                @update:type="t => feedbackOrDefault = t"
                @update:detail-question="q => editedEvent.detailQuestion = q"
                @update:questions="q => editedEvent.questions = q"
            />
        </fieldset>
    </div>
</template>

<script setup lang="ts">
import type { FeedbackType, ScheduleEvent } from '@/types/cloud'
import { colorToHex } from '@/utils/colors'
import { toHumanTime } from '@/utils/types'
const props = defineProps<{
    value: ScheduleEvent,
}>()

const permitSwipe = inject('permitSwipe', ref(false))
permitSwipe.value = false
onBeforeRouteLeave(() => {
    permitSwipe.value = true
})

const editedEvent = reactive(props.value)
watch(props.value, (newValue) => {
    Object.assign(editedEvent, newValue)
})

const colorHex = computed({
    get: () => editedEvent.color ? colorToHex(editedEvent.color) : undefined,
    set: (value) => editedEvent.color = value,
})
const colorOrWhite = computed(() => editedEvent.color ? editedEvent.color : 'white')
const feedbackOrDefault = computed<FeedbackType | ''>({
    get() {
        if (editedEvent.feedbackType?.length === 0 && canBeParallel(editedEvent.subtitle ?? '')) {
            return 'parallel'
        }
        return editedEvent.feedbackType ?? ''
    },
    set: (val) => editedEvent.feedbackType = val == '' ? undefined : val,
})

const ClassicEditor = ref()
onMounted(() => {
    import('@ckeditor/ckeditor5-build-classic').then((c) => {
        ClassicEditor.value = c.default
    })
})

function canBeParallel(s: string) {
    return s.indexOf(',') !== s.lastIndexOf(',')
}

</script>