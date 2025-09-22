<template>
    <div>
        <EditableField description="Vedení dne:" :document="`schedule/${selectedDayId}`" property="manager" />
        <EditableField description="Vaření:" :document="`schedule/${selectedDayId}`" property="cooking" />
        <EditableField description="Nádobí:" :document="`schedule/${selectedDayId}`" property="dishes" class="mb-2" />

        <div v-if="cloud.resolvedPermissions.editSchedule" class="ml-1">
            <h4>Lokace</h4>
            <label v-for="(location, index) in locations" :key="`location${index}`" :for="`location${index}`">
                <input
                    :id="`location${index}`" type="text" :name="`location${index}`" placeholder="Název místa"
                    :value="location" @change="e => updateLocation(index, (e.target as HTMLInputElement).value)">
                <br>
            </label>
            <button type="button" title="Přidat lokaci" @click="addLocation">+</button>
        </div>

        <div role="list" class="schedule">
            <ProgramLink
                v-for="(entry, index) in selectedProgram" :key="`e${index}`" ref="rows" role="listitem" :style="{
                    '--color': entry.color,
                    'border-left': isCurrent[index] ? '4px solid #0000ffaa' : undefined
                }" :day="p.day" :index="index" :entry="entry" @move-up="moveUp" @move-down="moveDown"
                @delete-program="deleteProgram" />

            <template v-if="cloud.resolvedPermissions.editSchedule">
                <NuxtLink :to="`/schedule/${p.day}/edit`">
                    <button type="button">
                        <Icon name="mdi:pencil" />&nbsp;Přidat program
                    </button>
                </NuxtLink>
                <ImportForm v-if="!!selectedDayId" :document="cloud.eventDoc('schedule', selectedDayId)" union />
                <button title="Exportovat den" @click="exportDay">
                    <Icon name='mdi:download' /> Export
                </button>
                <template v-if="admin.eventClipboard">
                    <button
                        type="button"
                        :title="`${admin.eventClipboard.title?.toUpperCase()}: ${admin.eventClipboard.subtitle || '--'}\n${stripHtml(admin.eventClipboard.description) || 'Žádný popis'}`"
                        @click="router.push(`/schedule/${p.day}/edit/paste`)" @contextmenu.prevent="pasteNow"
                        @auxclick.prevent="pasteNow">
                        <Icon name="mdi:clipboard-arrow-right" />&nbsp;Vložit
                    </button>
                    <button type="button" @click="admin.eventClipboard = null">
                        <Icon name="mdi:clipboard-remove" />&nbsp;Smazat schránku
                    </button>
                </template>
            </template>
        </div>

        <strong>
            <NuxtLink v-if="p.day == cloud.days.length - 1" to="/feedback" class="p-2 mt-2 d-block">
                <Icon name="mdi:rss" size="1.8rem" /> Vyplnit feedbackový dotazník
                <br>
                <small>{{ cloud.feedback.dirtyTime == 0 ? 'Obsahuje hodnocení programů a' :
                    'Kromě hodnocení konkrétních programů obsahuje' }} další obecnější otázky</small>
            </NuxtLink>
        </strong>
    </div>
</template>

<script setup lang="ts">
import type { ScheduleItem } from '@/types/cloud'
import { useCloudStore } from '@/stores/cloud'
import { setDoc } from '~/utils/trace'
import { useAdmin } from '~/stores/admin'
import { stripHtml } from '~/utils/sanitize'
import { arrayUnion } from 'firebase/firestore'

const p = defineProps<{ day: number }>()
const router = useRouter()
const cloud = useCloudStore()
const selectedDayId = computed(() => cloud.days[p.day]?.id)
const selectedProgram = computed(() => cloud.days?.[p.day]?.program || [])
const locations = computed(() => cloud.days[p.day]?.locations ?? [])
const admin = useAdmin()
const now = ref(new Date())
const prerendering = import.meta.prerender ?? false
const isCurrent = computed(() => selectedProgram.value.map((pr, i) => (!prerendering && parseInt((cloud.days[p.day].date ?? '').split('-')?.[2]) == new Date().getDate() && nowFormatted.value >= (pr.time ?? 0) && nowFormatted.value < (selectedProgram.value[i + 1]?.time ?? 0))))

const rows = ref<HTMLElement[]>([])
let interval: NodeJS.Timeout | undefined

onMounted(() => {
    interval = setInterval(() => {
        now.value = new Date()
    }, 1000 * 60)// Automatic time update

    isCurrent.value.find((v, i) => {
        if (v) {
            if (typeof rows.value[i]?.scrollIntoView === 'function') { rows.value[i]?.scrollIntoView() }
        }
    })
})
onBeforeUnmount(() => {
    if (interval) {
        clearInterval(interval)
    }
})

function pasteNow() {
    router.push(`/schedule/${p.day}/edit/pastenow`)
}

const nowFormatted = computed(() => now.value.getHours() * 100 + now.value.getMinutes())

async function deleteProgram(index: number, force = false) {
    if (force || confirm('Opravdu chcete odsranit tento bod programu?\n(Stiskněte při kliknutí Ctrl pro přeskočení tohoto dialogu)')) {
        await setDoc(cloud.eventDoc('schedule', selectedDayId.value), {
            program: [
                ...selectedProgram.value.slice(0, index),
                ...selectedProgram.value.slice(index + 1),
            ],
        }, { merge: true })
    }
}

function exportDay() {
    download(`${cloud.selectedEvent}-day-${selectedDayId.value}-${new Date().toLocaleString(navigator.language, { timeStyle: 'short', dateStyle: 'short' }).replace(':', '-')}.json`,
        JSON.stringify(toRaw(cloud.days[p.day])))
}

async function moveUp(program: ScheduleItem, index: number) {
    const newProgram = selectedProgram.value
    newProgram.splice(index, 1)
    newProgram.splice(index - 1, 0, program)
    await setDoc(cloud.eventDoc('schedule', selectedDayId.value), {
        program: newProgram,
    }, { merge: true })
}

async function moveDown(program: ScheduleItem, index: number) {
    const newProgram = selectedProgram.value
    newProgram.splice(index, 1)
    newProgram.splice(index + 1, 0, program)
    await setDoc(cloud.eventDoc('schedule', selectedDayId.value), {
        program: newProgram,
    }, { merge: true })
}

async function addLocation() {
    await setDoc(cloud.eventDoc('schedule', selectedDayId.value), {
        locations: arrayUnion(''),
    }, { merge: true })
}

async function updateLocation(index: number, text: string) {
    const newLocations = toRaw(locations.value)

    newLocations[index] = text

    await setDoc(cloud.eventDoc('schedule', selectedDayId.value), {
        locations: newLocations,
    }, { merge: true })
}

</script>

<style lang="scss">
.schedule {
    &>div {

        // even-odd background
        &:nth-child(odd) {
            backdrop-filter: brightness(0.9);
        }
    }

    &>details>summary {
        .edit {
            visibility: hidden;
        }

        &:hover,
        &:focus,
        &:focus-within {
            .edit {
                visibility: visible;
            }
        }

        &::marker {
            content: '';
        }

        &::-webkit-details-marker {
            display: none;
        }
    }
}

details {
    background: var(--color);

    .content {

        &>p:first-child {
            margin-top: .5rem;
        }

        &>p:last-child {
            margin-bottom: .5rem;
        }

        p {
            margin: 1rem .5rem
        }

        &>ul {
            display: inline-block;
        }
    }

    .content {
        display: inline-block;
    }

    &>a {
        display: block;
        overflow: hidden;

        &>.icon {
            margin-left: 2.9rem;
        }
    }

    &:hover {
        .more {
            opacity: 1;
        }
    }

    ol li+li ul {
        margin-top: .5rem;
    }
}

.more {
    color: #1a476ac0;
    float: right;
    display: flex;
    align-items: center;
    margin: .5rem;

    @media (hover: fine) {
        opacity: 0
    }
}
</style>
