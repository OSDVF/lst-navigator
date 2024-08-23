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
            id="time" :value="isNaN(editedEvent.time ?? NaN) ? '' : editedEvent.time" type="text" name="time" placeholder="HMM" required
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
            <label class="nowrap">
                <Icon name="mdi:shape" />&ensp; Ikona
            </label>&ensp;
            <input v-model="editedEvent.icon" type="hidden" name="icon">
            <IconSelect v-model="editedEvent.icon" />
        </div>
        <br>

        <label for="description">
            <Icon name="mdi:text" />&ensp; Dlouhý popis
        </label>&ensp;
        <ClientOnly>
            <ckeditor v-if="ClassicEditor" id="description" v-model="editedEvent.description" :editor="ClassicEditor" />
        </ClientOnly>

        <br>
        <fieldset>
            <legend>
                <Icon name="mdi:rss" />&ensp; Nastavení feedbacku
            </legend>
            <label for="feedbackType">Typ</label>&ensp;

            <select id="feedbackType" v-model="feedbackOrDefault" name="feedbackType">
                <option value="">Žádný</option>
                <option value="basic">⭐⭐⭐⭐⭐</option>
                <option value="complicated">Několik ⭐⭐⭐⭐⭐</option>
                <option value="text">Textová otázka</option>
                <option value="parallel">Paralelní programy</option>
            </select>

            <div v-if="editedEvent.feedbackType == 'complicated'">
                <h4>Položky k hodnocení</h4>
                <div v-for="(_question, index) in questionsOrBlank" :key="`q${index}`">
                    <label :for="`question${index}`">Položka {{ index + 1 }}</label>&ensp;
                    <input
                        :id="`question${index}`" v-model="editedEvent.questions![index]" type="text"
                        name="questions[]">
                    <button type="button" title="Odebrat" @click="editedEvent.questions!.splice(index, 1)">
                        <Icon name="mdi:trash-can" />
                    </button>
                </div>
                <button
                    v-show="questionsOrBlank[questionsOrBlank.length - 1]" type="button"
                    @click="editedEvent.questions!.push('')">+</button>
            </div>
            <p v-else-if="editedEvent.feedbackType === 'parallel'">
                <small>Paralelní programy: {{ parallel.join(', ') }}</small>
                <small v-if="parallel.length < 2" class="text-danger"><br>
                    <Icon name="mdi:exclamation-thick" />&ensp;Varování: Zadáno méně než 2 názvů paralelních programů
                </small>
            </p>
            <p v-if="editedEvent.feedbackType !== 'select'">
                <label for="detailQuestion">Doplňující otázka</label>&ensp;
                <input
                    id="detailQuestion" v-model="editedEvent.detailQuestion" type="text" name="detailQuestion"
                    placeholder="Tipy a připomínky">
            </p>
        </fieldset>
    </div>
</template>

<script setup lang="ts">
import type { FeedbackType, ScheduleEvent } from '@/types/cloud'
import { colorToHex } from '@/utils/colors'
import { toHumanTime, getParallelEvents } from '@/utils/types'

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
const parallel = computed(() => getParallelEvents(editedEvent))

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
const questionsOrBlank = computed(() => editedEvent.questions?.length ? editedEvent.questions : [''])

const ClassicEditor = ref()
onMounted(() => {
    import('@ckeditor/ckeditor5-build-classic').then((c) => {
        ClassicEditor.value = c.default
    })
})

function canBeParallel(s: string) {
    return s.indexOf(',') !== s.lastIndexOf(',');
}

</script>