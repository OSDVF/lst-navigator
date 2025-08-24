<template>
    <fieldset :class="loading && 'loading'" :disabled="p.disabled">
        <legend class="flex-center">
            <input
                v-autowidth="{
                    overflowParent: false,
                }" title="Název sekce" class="h3 editable" :value="p.isDummy ? '' : editedCategory.title"
                :placeholder="editedCategory.title || 'Nová sekce'" type="text"
                @change="(e) => editedCategory.title = (e.target as HTMLInputElement).value">

            &ensp;<span class="muted"># {{ p.index + 1 }}&ensp;</span>
            <div v-show="!p.disabled" class="fieldset-edit">
                <NuxtLink :to="`/feedback/${p.index}`" class="button" title="Náhled sekce">
                    <Icon name="mdi:eye" />
                </NuxtLink>
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
                <span
                    class="button" title="Odebrat sekci" @click.exact="deleteDocAndShift"
                    @click.ctrl="deleteDocAndShift(true)">
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
            <input
                :id="`dayTitles${p.index}`" :checked="editedCategory.dayTitles ?? true" type="checkbox"
                name="dayTitles"
                @change="e => editedCategory.dayTitles = (e.currentTarget as HTMLInputElement).checked">
            <label :for="`dayTitles${p.index}`">Zobrazit názvy dnů</label><br>
            <span class="muted">Odpovídající programy:</span>
            <div :class="isEmpty(matches) && 'inline muted' || undefined">
                <span v-for="(item, when) in matches" :key="when" :title="item.subtitle">
                    {{ item.title }} <span class="muted">{{ when }}{{ when == '...' && ' ' || ', ' }}</span>
                </span>
                <template v-if="isEmpty(matches)">
                    Žádné
                </template>
            </div>
        </fieldset>
        <div v-if="type != 'group'" class="mt-2 relative" title="Vlastní otázky" tabindex="0">
            <FeedbackEditIndividual
                v-for="(q, i) in questionsOrBlank" :key="`i${i}`" :disabled="p.disabled"
                :model-value="q" :index="i" @update:model-value="e => updateQuestion(e, i)"
                @delete="updateQuestion(undefined, i)" />
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
import cloneDeep from 'lodash.clonedeep'
import isEqual from 'lodash.isequal'
import isEmpty from 'lodash.isempty'
import { setDoc, deleteDoc } from '~/utils/trace'
import { useCloudStore } from '~/stores/cloud'
import type { FeedbackConfig, ScheduleItem } from '~/types/cloud'
import { useAdmin } from '~/stores/admin'
import { storeToRefs } from 'pinia'

const p = defineProps<{
    index: number;
    isDummy?: boolean;
    disabled?: boolean;
}>()
const error = ref()
const loading = ref(false)

const e = defineEmits<{
    beginUpdate: [],
    endUpdate: [],
}>()

const admin = useAdmin()
const cloud = useCloudStore()
const doc = computed(() => cloud.eventDoc('feedbackConfig', p.index.toString()))
const dummy: FeedbackConfig = {
    title: 'Nová sekce',
    dayTitles: true,
    individual: [],
}
const editedCategory = ref<FeedbackConfig>(toRaw(cloud.feedbackConfig?.[p.index] ?? dummy))
const reloading = ref(false)
watch(storeToRefs(cloud).feedbackConfig, (newConfig) => {
    reloading.value = true
    editedCategory.value = toRaw(newConfig?.[p.index] ?? dummy)
    type.value = hydrateType()
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

let previousValue = cloneDeep(editedCategory.value)
watch(editedCategory, (value) => {
    if (!reloading.value && !isEqual(value, previousValue)) {
        e('beginUpdate')
        error.value = undefined
        loading.value = true
        setDoc(doc.value, value, { merge: true }).catch(e => error.value = e).finally(() => {
            loading.value = false
            e('endUpdate')
        })
    }
    previousValue = cloneDeep(value)
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

function hydrateType() {
    return editedCategory.value.group ? editedCategory.value.individual?.length ? 'both' : 'group' : 'individual'
}
const type = ref<keyof typeof types>(hydrateType())
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
        const result: { [when: string]: ScheduleItem } = {}
        for (const day of cloud.days) {
            function addToResult(program: ScheduleItem) {
                result[`${day.name.substring(0, 2)} ${toHumanTime(program.time)}`] = program
            }
            const exp = (editedCategory.value.group ?? '').toString()
            if (exp.match(/[a-zA-Z0-9 ]|,/g)?.length == exp.length) {
                for (const name of exp.split(',')) {
                    const programIndex = day.program.findIndex(event => event.title?.match(name))
                    if (programIndex !== -1) {
                        addToResult(day.program[programIndex])
                        if (count++ > 5) {
                            result['...'] = { title: '' }
                            return result
                        }
                    }
                }
            } else {
                for (const program of day.program) {
                    if (program.title?.match(editedCategory.value.group ?? '')) {
                        addToResult(program)
                        if (count++ > 5) {
                            result['...'] = { title: '' }
                            return result
                        }
                    }
                }
            }
        }
        return result
    }
    return null
})

async function moveUp() {
    reloading.value = true
    const other = toRaw(cloud.feedbackConfig?.[p.index - 1])

    await setDoc(cloud.eventDoc('feedbackConfig', (p.index - 1).toString()), editedCategory.value)
    await setDoc(doc.value, other)
    nextTick(() => reloading.value = false)
}

async function moveDown() {
    reloading.value = true
    const other = toRaw(cloud.feedbackConfig?.[p.index + 1])

    await setDoc(cloud.eventDoc('feedbackConfig', (p.index + 1).toString()), editedCategory.value)
    await setDoc(doc.value, other)
    nextTick(() => reloading.value = false)
}

async function deleteDocAndShift(force = false) {
    if (force || confirm('Opravdu chcete odstranit tuto sekci?\n(Stiskněte Ctrl pro přeskočení tohoto dialogu)')) {
        loading.value = true
        reloading.value = true
        const promises: Promise<void>[] = []
        const shapshot = cloneDeep(cloud.feedbackConfig)
        e('beginUpdate')
        if (p.index !== shapshot.length - 1) {
            for (let i = p.index; i < shapshot.length - 1; i++) {
                promises.push(setDoc(cloud.eventDoc('feedbackConfig', i.toString()), shapshot[i + 1]))
            }
        }
        await Promise.all(promises)
        await deleteDoc(cloud.eventDoc('feedbackConfig', (shapshot.length - 1).toString()))
        nextTick(() => {
            reloading.value = false
            loading.value = false
            e('endUpdate')
        })
    }
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