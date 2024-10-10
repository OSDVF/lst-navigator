<template>
    <fieldset :class="loading && 'loading'">
        <legend class="flex-center">
            <input
                v-autowidth class="h3 editable" :value="p.isDummy ? '' : editedCategory.title"
                :placeholder="editedCategory.title || 'Nová sekce'" type="text"
                @change="(e) => editedCategory.title = (e.target as HTMLInputElement).value">

            &ensp;<span class="muted"># {{ p.index + 1 }}&ensp;</span>
            <div class="fieldset-edit">
                <span v-if="p.index > 0" class="button" title="Posunout sekci nahoru" @click="moveUp">
                    <Icon name="mdi:arrow-up" />
                </span>
                <span
                    v-if="p.index < cloud.feedbackConfig?.length - 1" class="button" title="Posunout sekci dolů"
                    @click="moveDown">
                    <Icon name="mdi:arrow-down" />
                </span>
                <span class="button" title="Kopírovat sekci" @click="admin.feedbackConfigClipboard = editedCategory">
                    <Icon name="mdi:clipboard-plus" />
                </span>
                <span
                    v-show="admin.feedbackConfigClipboard" class="button" title="Přepsat sekci ze schránky"
                    @click="() => admin.feedbackConfigClipboard && (editedCategory = admin.feedbackConfigClipboard)">
                    <Icon name="mdi:clipboard-text" />
                </span>
                <span class="button" title="Odebrat sekci" @click="deleteDocAndShift">
                    <Icon name="mdi:trash-can" />
                </span>
            </div>
        </legend>

        <SimpleSelect id="type" v-model="safeType" class="p-1" :labels="types" title="Typ" />

        <fieldset v-if="type != 'individual'">
            <legend>
                <label for="group">
                    <Icon name="mdi:calendar-month" /> Přiřazené programy
                </label>&ensp;
            </legend>
            <input
                v-model.lazy="editedCategory.group" type="text" name="group" placeholder="Titulek programů (RegExp)"
                title="Titulek programů (RegExp)" class="w-full mb-1">
            <span class="muted">Odpovídající programy:</span>
            <div :class="_.isEmpty(matches) && 'inline muted' || undefined">
                <span v-for="(title, when) in matches" :key="when">
                    {{ title }} <span class="muted">{{ when }}{{ when == '...' && ' ' || ', ' }}</span>
                </span>
                <template v-if="_.isEmpty(matches)">
                    Žádné
                </template>
            </div>
        </fieldset>
        <div v-if="type != 'group'" class="mt-2 relative" title="Vlastní otázky" tabindex="0">
            <FeedbackEditIndividual
                v-for="(q, i) in questionsOrBlank" :key="`i${i}`" :model-value="q" :index="i"
                @update:model-value="e => updateQuestion(e, i)" @delete="updateQuestion(undefined, i)" />
            <br>
            <button
                type="button" title="Přidat otázku" class="absolute" style="bottom: .5rem; left:.5rem"
                @click="() => { if (!editedCategory.individual) { editedCategory.individual = [] } editedCategory.individual?.push(blank) }">
                +
                <Icon name="mdi:form-dropdown" />
            </button>
        </div>
        <div v-if="error" class="p">
            <code tabindex="0" title="Chyba" class="error">{{ error }}</code>
        </div>
    </fieldset>
</template>

<script lang="ts" setup>
import _ from 'lodash'
import { setDoc, deleteDoc } from '~/utils/trace'
import { useCloudStore } from '~/stores/cloud'
import type { FeedbackConfig } from '~/types/cloud'
import { useAdmin } from '~/stores/admin'
import { storeToRefs } from 'pinia'

const p = defineProps<{
    index: number;
    isDummy?: boolean;
}>()
const error = ref()
const loading = ref(false)

const admin = useAdmin()
const cloud = useCloudStore()
const doc = computed(() => cloud.eventDoc('feedbackConfig', p.index.toString()))
const dummy = {
    title: 'Nová sekce',
    individual: [],
}
const editedCategory = ref<FeedbackConfig>(toRaw(cloud.feedbackConfig?.[p.index] ?? dummy))
const reloading = ref(false)
watch(storeToRefs(cloud).feedbackConfig, (newConfig) => {
    reloading.value = true
    editedCategory.value = toRaw(newConfig?.[p.index] ?? dummy)
    reloading.value = false
})

const safeType = computed({
    get: () => type.value,
    set(value) {
        if (value === 'group' && editedCategory.value.individual?.length) {
            if (confirm('Změnou typu sekce na ' + types[value].text + ' se odstraní všechny vlastní otázky. Opravdu chcete pokračovat?')) {
                type.value = value
                editedCategory.value.individual = []
            }
        } else if (value === 'individual' && editedCategory.value.group) {
            if (confirm('Změnou typu sekce na ' + types[value].text + ' se odstraní všechny přiřazené části. Opravdu chcete pokračovat?')) {
                type.value = value
                editedCategory.value.group = ''
            }
        } else {
            type.value = value
        }
    },
})

let previousValue = _.cloneDeep(editedCategory.value)
watch(editedCategory, (value) => {
    if (!reloading.value && !p.isDummy && !_.isEqual(value, previousValue)) {
        error.value = undefined
        loading.value = true
        setDoc(doc.value, value, { merge: true }).catch(e => error.value = e).finally(() => loading.value = false)
    }
    previousValue = _.cloneDeep(value)
}, { deep: true })

const types = {
    group: {
        text: 'Programy z harmonogramu',
        icon: 'mdi:calendar-month',
    },
    individual: {
        text: 'Vlastní otázky',
        icon: 'mdi:form-dropdown',
    },
    both: {
        text: 'Programy i vlastní otázky',
        icon: 'mdi:ballot-outline',
    },
}
const type = ref<keyof typeof types>(editedCategory.value.group ? editedCategory.value.individual?.length ? 'both' : 'group' : 'individual')
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
        editedCategory.value.individual = value
    },
})

function updateQuestion(value: FeedbackConfig['individual'][0] | undefined, i: number) {
    if (value) {
        questionsOrBlank.value[i] = value
    } else {
        questionsOrBlank.value.splice(i, 1)
    }
    editedCategory.value.individual = questionsOrBlank.value
}

const matches = computed(() => {
    if (type.value !== 'individual') {
        let count = 0
        const result: { [when: string]: string } = {}
        for (const day of cloud.days) {
            for (const program of day.program) {
                if (program.title?.match(editedCategory.value.group ?? '')) {
                    result[`${day.name.substring(0, 2)} ${toHumanTime(program.time)}`] = program.title
                    if (count++ > 5) {
                        result['...'] = ''
                        return result
                    }
                }
            }
        }
        return result
    }
    return null
})

async function moveUp() {
    const other = toRaw(cloud.feedbackConfig?.[p.index - 1])

    await setDoc(cloud.eventDoc('feedbackConfig', (p.index - 1).toString()), editedCategory.value)
    await setDoc(doc.value, other)
}

async function moveDown() {
    const other = toRaw(cloud.feedbackConfig?.[p.index + 1])

    await setDoc(cloud.eventDoc('feedbackConfig', (p.index + 1).toString()), editedCategory.value)
    await setDoc(doc.value, other)
}

async function deleteDocAndShift() {
    if (p.index !== cloud.feedbackConfig.length - 1) {
        for (let i = p.index; i < cloud.feedbackConfig.length - 1; i++) {
            await setDoc(cloud.eventDoc('feedbackConfig', i.toString()), toRaw(cloud.feedbackConfig[i + 1]))
        }
    }
    await deleteDoc(cloud.eventDoc('feedbackConfig', (cloud.feedbackConfig.length - 1).toString()))
}

</script>

<style lang="scss">
fieldset.loading {
    border-image-slice: 1;
    animation: border 1s infinite linear;
}

@keyframes border {
    0% {
        border-top-color: #f00;
        border-right-color: #ff0;
        border-bottom-color: #0f0;
        border-left-color: #0ff;
    }

    25% {
        border-top-color: #0ff;
        border-right-color: #f00;
        border-bottom-color: #ff0;
        border-left-color: #0f0;
    }

    50% {
        border-top-color: #0f0;
        border-right-color: #0ff;
        border-bottom-color: #f00;
        border-left-color: #ff0;
    }

    75% {
        border-top-color: #ff0;
        border-right-color: #0f0;
        border-bottom-color: #0ff;
        border-left-color: #f00;
    }

    100% {
        border-top-color: #f00;
        border-right-color: #ff0;
        border-bottom-color: #0f0;
        border-left-color: #0ff;
    }
}
</style>