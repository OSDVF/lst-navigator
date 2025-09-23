<template>
    <div>
        <label for="title">
            <Icon name="mdi:timeline-alert" />&ensp; Titulek*
        </label>&ensp;
        <input
            id="title" v-model="editingItem.title" type="text" name="title" placeholder="např. Večerní program"
            required>

        <p>
            <label for="subtitle">
                <Icon name="mdi:timeline-text-outline" />&ensp; Podtitulek
            </label>&ensp;
            <input
                id="subtitle" v-model="editingItem.subtitle" type="text" name="subtitle"
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
            id="time" :value="isNaN(editingItem.time ?? NaN) ? '' : editingItem.time" type="text" name="time"
            placeholder="HMM" required
            @input="(e) => editingItem.time = parseInt((e.target as HTMLInputElement).value.replace(/[^0-9]/g, ''))">
        <br><small>{{ editingItem.time ? `Bude zobrazeno ${toHumanTime(editingItem.time)}` : "Např. 730 = 7:30"
        }}</small>

        <br>

        <p>
            <label for="location">
                <Icon name="mdi:location" />&ensp; Místo
            </label>&ensp;
            <select
                id="location" v-model="editingItem.location" name="location" @pointerenter="permitSwipe = false"
                @pointerleave="permitSwipe = true">
                <option v-for="(location, index) in locations" :key="`l${index}`" :value="index">{{ location }}</option>
            </select>
            <button
                type="button" title="Odstranit místo" @pointerenter="permitSwipe = false"
                @pointerleave="permitSwipe = true" @click="delete editingItem.location">
                <Icon name="mdi:trash" />
            </button>
        </p>
        <p>
            <label for="color">
                <Icon name="mdi:palette" />&ensp; Barva
            </label>&ensp;
            <input id="color" v-model="editingItem.color" type="text" name="color">&ensp;
            <input v-model="colorHex" type="color">&ensp;<span
                :style="`background: ${editingItem.color}`" tabindex="0"
                title="Test barvy" class="inline-block p-1">{{ dayNight[windowDark ? 1 : 0] }}</span>
            <span :style="`background: ${colorOrWhite};filter:invert(1)`" class="inline-block p-1">{{
                dayNight[windowDark ? 0 : 1] }}</span>
            &ensp;<button type="button" @click="editingItem.color = ''">Vymazat</button>
        </p>
        <div class="flex-center">
            <label class="nowrap" for="icon">
                <Icon name="mdi:shape" />&ensp; Ikona
            </label>&ensp;
            <input v-model="editingItem.icon" type="hidden" name="icon">
            <IconSelect id="icon" v-model="editingItem.icon" />
        </div>
        <br>

        <label for="description">
            <Icon name="mdi:text" />&ensp; Dlouhý popis
        </label>&ensp;
        <ClassicCKEditor id="description" v-model.lazy="editingItem.description" />
        <input v-model.lazy="editingItem.description" type="hidden" name="description">

        <br>
        <fieldset>
            <legend>
                <Icon name="mdi:rss" />&ensp; Nastavení feedbacku
            </legend>

            <FeedbackTypeSelect
                :type="feedbackOrDefault" :permit-empty="true" :schedule-item="editingItem"
                :detail-question="editingItem.detailQuestion" :questions="editingItem.questions"
                @update:type="t => feedbackOrDefault = t" @update:detail-question="q => editingItem.detailQuestion = q"
                @update:questions="q => editingItem.questions = q" />
        </fieldset>
    </div>
</template>

<script setup lang="ts">
import type { FeedbackType, ScheduleItem } from '@/types/cloud'
import { colorToHex, windowIsDark } from '@/utils/colors'
import { toHumanTime } from '@/utils/utils'
const cloud = useCloudStore()
const route = useRoute()
const selectedDayIndex = computed(() => typeof route.params.day === 'string' ? parseInt(route.params.day) : 0)

const locations = computed(() => cloud.days[selectedDayIndex.value]?.locations ?? [])

const dayNight = ['DAY', 'NIGHT']
const windowDark = windowIsDark()

const props = defineProps<{
    value: ScheduleItem,
}>()

const permitSwipe = inject('permitSwipe', ref(false))
onMounted(() => permitSwipe.value = false)
onBeforeRouteLeave(() => {
    permitSwipe.value = true
})

const editingItem = reactive(props.value)
watch(() => props.value, (newValue) => {
    Object.assign(editingItem, newValue)
})

const colorHex = computed({
    get: () => editingItem.color ? colorToHex(editingItem.color) : undefined,
    set: (value) => editingItem.color = value,
})
const colorOrWhite = computed(() => editingItem.color ? editingItem.color : 'white')
const feedbackOrDefault = computed<FeedbackType | ''>({
    get() {
        if (editingItem.feedbackType?.length === 0 && canBeParallel(editingItem.subtitle ?? '')) {
            return 'parallel'
        }
        return editingItem.feedbackType ?? ''
    },
    set: (val) => editingItem.feedbackType = val == '' ? undefined : val,
})

function canBeParallel(s: string) {
    return s.indexOf(',') !== s.lastIndexOf(',')
}

</script>