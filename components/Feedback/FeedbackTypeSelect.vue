<template>
    <div>
        <label for="feedbackType">Typ otázky</label>&ensp;
        <select id="feedbackType" v-model="type" :disabled="p.disabled" name="feedbackType">
            <option v-if="p.permitEmpty" value="">Žádný</option>
            <option value="basic">⭐⭐⭐⭐⭐</option>
            <option value="complicated">Několik ⭐⭐⭐⭐⭐</option>
            <option value="text">Textová otázka</option>
            <option v-if="!p.scheduleItem" value="select">Výběr z možností</option>
            <option value="parallel">Paralelní programy</option>
        </select>

        <small v-if="type && type !== 'parallel' && p.scheduleItem?.subtitle?.includes(',')">
            <br>Podtitulek obsahuje čárku. Pokud jde o paralelní programy, nastavte typ otázky na "Paralelní programy".
        </small>

        <div v-if="['complicated', 'select'].includes(type)">
            <h4 v-if="p.scheduleItem">Položky k hodnocení</h4>
            <div v-for="(_question, index) in questionsOrBlank" :key="`q${index}`">
                <label :for="`question${index}`" class="muted">
                    <Icon :name="type == 'complicated' ? 'mdi:chat-question-outline' : 'mdi:arrow-right'" />
                    {{ index + 1 }}
                </label>&ensp;
                <input :id="`question${index}`" v-model.lazy="questions![index]" type="text" name="questions[]">
                <button :disabled="p.disabled" type="button" title="Odebrat" @click="questions!.splice(index, 1)">
                    <Icon name="mdi:trash-can" />
                </button>
            </div>
            <button
                v-show="questionsOrBlank[questionsOrBlank.length - 1]" :disabled="p.disabled" type="button"
                @click="questions = [...(questions ?? []), '']">
                <Icon :name="type == 'complicated' ? 'mdi:chat-question-outline' : 'mdi:arrow-right'" />
                +
            </button>
        </div>
        <p v-else-if="type === 'parallel'">
            <template v-if="typeof p.scheduleItem !== 'undefined'">
                <small>Paralelní programy:
                    <template v-for="(par, index) in parallel" :key="`p-${index}`">
                        <span
                            :style="`color: ${randomColor({
                                seed: index * 1000,
                                luminosity: 'bright',
                            })}`">
                            {{ par }}
                        </span>
                        {{ index < parallel.length - 1 ? ', ' : '' }} </template>
                </small>
                <small v-if="parallel.length < 2" class="text-danger"><br>
                    <Icon name="mdi:exclamation-thick" />&ensp;Varování: Zadáno méně než 2 názvů paralelních programů
                    (oddělujte čárkou
                    v podtitulku)
                </small>
            </template>
        </p>
        <p v-if="!!p.type && type !== 'select' && typeof p.scheduleItem !== 'undefined'">
            <label for="detailQuestion">Doplňující otázka</label>&ensp;
            <input
                id="detailQuestion" v-model.lazy="detailQuestion" :disabled="p.disabled" type="text"
                name="detailQuestion" placeholder="Tipy a připomínky">
        </p>
    </div>
</template>

<script setup lang="ts">
import type { FeedbackType, ScheduleItem } from '~/types/cloud'
import { getParallelEvents } from '@/utils/types'
import randomColor from 'randomcolor'

const p = defineProps<{
    type: FeedbackType | '',
    permitEmpty?: boolean,
    questions?: string[],
    scheduleItem?: ScheduleItem,
    detailQuestion?: string,
    disabled?: boolean,
}>()

const e = defineEmits<{
    'update:detailQuestion': [value: string],
    'update:questions': [value: string[]],
    'update:type': [value: FeedbackType | ''],
}>()

const questions = computed({
    get() {
        return p.questions
    },
    set(value: string[] | undefined) {
        if (Array.isArray(value)) {
            e('update:questions', value)
        }
    },
})

const questionsOrBlank = computed(() => questions.value?.length ? questions.value : [''])
const parallel = computed(() => p.scheduleItem ? getParallelEvents(p.scheduleItem) : [])

const type = computed({
    get() {
        return p.type
    },
    set(value: FeedbackType | '') {
        e('update:type', value)
    },
})

const detailQuestion = computed({
    get() {
        return p.detailQuestion
    },
    set(value?: string) {
        if (typeof value === 'string') {
            e('update:detailQuestion', value)
        }
    },
})
</script>