<template>
    <div>
        <p>
            <input
                class="h3 editable" :value="p.isDummy ? '' : editedCategory.title" :placeholder="editedCategory.title || 'Nová sekce'"
                type="text" @change="(e) => editedCategory.title = (e.target as HTMLInputElement).value">
            <button
                title="Odebrat sekci" @click="deleteDoc(cloud.eventDoc('feedbackConfig', p.index.toString()))">
                <Icon name="mdi:trash-can" />
            </button>
        </p>

        <p>
            <label for="type">Typ</label>&ensp;
            <select id="type" v-model="type">
                <option value="group">Části harmonogramu</option>
                <option value="individual">Vlastní otázky</option>
                <option value="both">Obojí</option>
            </select>
        </p>

        <fieldset v-if="type != 'individual'">
            <legend>Části harmonogramu</legend>
            <input v-model="editedCategory.group" type="text" name="group" placeholder="Titulek programů (RegExp)">
        </fieldset>
        <fieldset v-if="type != 'group'">
            <legend>Otázky</legend>
            <FeedbackEditIndividual
                v-for="(q, i) in questionsOrBlank" :key="`i${i}`" :model-value="q" :index="i"
                @update:model-value="v => questionsOrBlank[i] = v"
            />
            <button
                type="button"
                @click="editedCategory.individual.push(blank)">+</button>
        </fieldset>
    </div>
</template>

<script lang="ts" setup>
import { setDoc, deleteDoc } from '~/utils/trace'
import { useCloudStore } from '~/stores/cloud'
import type { FeedbackConfig } from '~/types/cloud'

const p = defineProps<{
    index: number;
    isDummy?: boolean;
}>()

const cloud = useCloudStore()
const editedCategory = ref<FeedbackConfig>(toRaw(cloud.feedback.config?.[p.index] ?? {
    title: 'Nová sekce',
    individual: [],
}))

watch(editedCategory, (value) => {
    setDoc(cloud.eventDoc('feedbackConfig', p.index.toString()), value, { merge: true })
}, { deep: true })

const type = ref(editedCategory.value.group ? editedCategory.value.individual ? 'both' : 'group' : 'individual')
const blank: FeedbackConfig['individual'][0] = {
    name: '',
    questions: [],
    type: 'text',
    description: '',
}
const questionsOrBlank = computed({
    get() {
        return editedCategory.value.individual?.length ? editedCategory.value.individual : [blank]
    },
    set(value: FeedbackConfig['individual']) {
        editedCategory.value = {
            ...editedCategory.value,
            individual: value,
        }
    },
})

</script>