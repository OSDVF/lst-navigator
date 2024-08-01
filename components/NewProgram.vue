<template>
    <form @submit.prevent="addProgram">
        <label for="title">Titulek</label>&ensp;
        <input id="title" v-model="newEvent.title" type="text" name="title" placeholder="např. Večerní program">

        <p>
            <label for="subtitle">Podtitulek</label>&ensp;
            <input
                id="subtitle" v-model="newEvent.subtitle" type="text" name="subtitle"
                placeholder="např. Hra v týmech">
            <br>
            <small>Názvy paralelních programů oddělte v <strong>podtitulku</strong> čárkou: <em>Frisbee (Tom), Relax
                (Kaba), ...</em></small>
        </p>

        <br>
        <label for="time">Čas</label>&ensp;
        <input id="time" v-model="newEvent.time" type="text" name="time" placeholder="HMM">
        <br><small>{{ newEvent.time ? `Bude zobrazeno ${toHumanTime(newEvent.time)}` : "Např. 730 = 7:30" }}</small>

        <br>
        <label for="color">Barva</label>&ensp;
        <input id="color" v-model="newEvent.color" type="text" name="color">&ensp;
        <input v-model="colorHex" type="color">&ensp;<span
            :style="`background: ${newEvent.color}`" title="Test barvy"
            class="inline-block p-1">DAY</span>
        <span :style="`background: ${colorOrWhite};filter:invert(1)`" class="inline-block p-1">NIGHT</span>
        &ensp;<button type="button" @click="newEvent.color = ''">Vymazat</button>

        <br>
        <label for="description">Dlouhý popis</label>&ensp;
        <ClientOnly>
            <ckeditor v-if="ClassicEditor" id="description" v-model="newEvent.description" :editor="ClassicEditor" />
        </ClientOnly>

        <fieldset>
            <legend>Nastavení feedbacku</legend>
            <label for="feedbackType">Typ</label>&ensp;

            <select id="feedbackType" v-model="feedbackOrDefault" name="feedbackType">
                <option :value="undefined">Žádný</option>
                <option value="basic">⭐⭐⭐⭐⭐</option>
                <option value="complicated">Několik ⭐⭐⭐⭐⭐</option>
                <option value="text">Textová otázka</option>
                <option value="parallel">Paralelní programy</option>
            </select>

            <div v-if="newEvent.feedbackType == 'complicated'">
                <h4>Položky k hodnocení</h4>
                <div v-for="(question, index) in questionsOrBlank" :key="`q${index}`">
                    <label :for="`question${index}`">Položka {{ index + 1 }}</label>&ensp;
                    <input :id="`question${index}`" v-model="newEvent.questions![index]" type="text" name="questions[]">
                    <button type="button" title="Odebrat" @click="newEvent.questions!.splice(index, 1)">
                        <IconCSS name="mdi:trash-can" />
                    </button>
                </div>
                <button
                    v-show="questionsOrBlank[questionsOrBlank.length - 1]" type="button"
                    @click="newEvent.questions!.push('')">+</button>
            </div>
            <p v-else-if="newEvent.feedbackType === 'parallel'">
                <small>Paralelní programy: {{ getParallelEvents(newEvent).join(', ') }}</small>
            </p>
            <p v-if="newEvent.feedbackType !== 'select'">
                <label for="detailQuestion">Doplňující otázka</label>&ensp;
                <input
                    id="detailQuestion" v-model="newEvent.detailQuestion" type="text" name="detailQuestion"
                    placeholder="Tipy a připomínky">
            </p>
        </fieldset>

    </form>
</template>

<script setup lang="ts">
import { colorToHex } from '@/utils/colors'
import { toHumanTime, getParallelEvents } from '@/utils/types'
import type { FeedbackType, ScheduleEvent } from '@/types/cloud'

const permitSwipe = inject('permitSwipe', ref(false))
permitSwipe.value = false
onBeforeRouteLeave(() => {
    permitSwipe.value = true
})

const model = defineModel<ScheduleEvent>({
    required: true,
})
const newEvent = reactive(model.value)
watch(model, (val) => Object.assign(newEvent, val))
watch(newEvent, (val) => Object.assign(model.value, val))

const colorHex = computed({
    get: () => newEvent.color ? colorToHex(newEvent.color) : undefined,
    set: (value) => newEvent.color = value,
})
const colorOrWhite = computed(() => newEvent.color ? newEvent.color : 'white')
const feedbackOrDefault = computed<FeedbackType | undefined>({
    get() {
        if (newEvent.feedbackType?.length === 0 && canBeParallel(newEvent.subtitle ?? '')) {
            return 'parallel'
        }
        return newEvent.feedbackType
    },
    set: (val) => newEvent.feedbackType = val,
})
const questionsOrBlank = computed(() => newEvent.questions?.length ? newEvent.questions : [''])

const ClassicEditor = ref()
onMounted(() => {
    import('@ckeditor/ckeditor5-build-classic').then((c) => {
        ClassicEditor.value = c.default
    })
})

function canBeParallel(s: string) {
    return s.indexOf(',') !== s.lastIndexOf(',');
}

function addProgram(event: Event) {
    const data = new FormData(event.target as HTMLFormElement)
}

</script>