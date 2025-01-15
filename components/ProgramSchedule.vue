<template>
    <div>
        <EditableField description="Vedení dne:" :document="`schedule/${selectedDayId}`" property="manager" />
        <EditableField description="Vaření:" :document="`schedule/${selectedDayId}`" property="cooking" />
        <EditableField description="Nádobí:" :document="`schedule/${selectedDayId}`" property="dishes" class="mb-2" />

        <div role="list" class="schedule">
            <details
                v-for="(entry, index) in selectedProgram" :key="`e${index}`" ref="rows" role="listitem" :style="{
                    '--color': entry.color,
                    'border-left': isCurrent[index] ? '4px solid #0000ffaa' : undefined
                }">
                <summary class="flex">
                    <span class="align-top mr-1">
                        {{ toHumanTime(entry.time) }}
                    </span>
                    <div class="inline-block">
                        <h4>{{ entry.title }}</h4>
                        <h5 v-if="entry.subtitle">
                            {{ entry.subtitle }}
                        </h5>
                    </div>
                    <div class="inline-block text-right" style="flex-grow: 1;">
                        <span v-if="cloud.user.auth?.uid && cloud.resolvedPermissions.editSchedule" class="edit">
                            <button
                                v-if="index > 0" class="edit" title="Posunout nahoru"
                                @click.prevent="moveUp(entry, index)">
                                <Icon class="icon" name="mdi:arrow-up" />
                            </button>
                            <button
                                v-if="index < selectedProgram.length - 1" class="edit" title="Posunout dolů"
                                @click.prevent="moveDown(entry, index)">
                                <Icon class="icon" name="mdi:arrow-down" />
                            </button>
                            <NuxtLink :to="`/schedule/${p.day}/edit/${index}`">
                                <button class="edit" title="Upravit">
                                    <Icon class="icon" name="mdi:pencil" />
                                </button>
                            </NuxtLink>
                            <button
                                class="edit" title="Kopírovat do schránky" type="button"
                                @click="admin.eventClipboard = { ...entry }">
                                <Icon class="icon" name="mdi:clipboard-text" />
                            </button>
                            <button class="edit" title="Smazat" @click.prevent.exact="deleteProgram(index)" @click.ctrl="deleteProgram(index, true)">
                                <Icon class="icon" name="mdi:trash-can" />
                            </button>
                            &ensp;
                        </span>
                        <Icon v-if="entry.icon" :name="entry.icon" />
                    </div>
                </summary>
                <NuxtLink :to="`/schedule/${p.day}/${index}`" style="position: relative">
                    <Icon
                        v-if="!(entry.description?.match('<p|<br|<ol|<ul') ?? false)" class="icon"
                        name="mdi:chevron-right" />
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <div class="content" v-html="entry.description?.trim() || '<p>Žádné detaily</p>'" />
                    <span class="more">
                        <Icon class="icon" name="mdi:rss" />
                        <template v-if="!getFeedback(entry, index)">Feedback a detaily</template>
                        <NuxtRating
                            v-else :rating-value="(getFeedback(entry, index) as number)" rating-size="1.2rem"
                            inactive-color="#aaa" :title="`Tvé hodnocení: ${getFeedback(entry, index)}`"
                            tabindex="0" />
                    </span>
                </NuxtLink>
            </details>

            <template v-if="cloud.resolvedPermissions.editSchedule">
                <NuxtLink :to="`/schedule/${p.day}/edit`">
                    <button type="button">
                        <Icon name="mdi:pencil" />&nbsp;Přidat program
                    </button>
                </NuxtLink>
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
    </div>
</template>

<script setup lang="ts">
import type { FeedbackType, ScheduleItem } from '@/types/cloud'
import { useCloudStore } from '@/stores/cloud'
import { useSettings } from '@/stores/settings'
import { toHumanTime } from '@/utils/types'
import { setDoc } from '~/utils/trace'
import { useAdmin } from '~/stores/admin'
import { stripHtml } from '~/utils/sanitize'

const p = defineProps<{day: number}>()
const router = useRouter()
const cloud = useCloudStore()
const selectedDayId = computed(() => cloud.days[p.day]?.id)
const selectedProgram = computed(() => cloud.days?.[p.day]?.program || [])
const settings = useSettings()
const admin = useAdmin()
const now = ref(new Date())
const prerendering = import.meta.prerender ?? false
const isCurrent = computed(() => selectedProgram.value.map((pr, i) => (!prerendering && parseInt((cloud.days[p.day].date ?? '').split('-')?.[2]) == new Date().getDate() && nowFormatted.value > (pr.time ?? 0) && nowFormatted.value < (selectedProgram.value[i + 1]?.time ?? 0))))

const rows = ref<HTMLElement[]>([])
let interval: NodeJS.Timeout | undefined

onMounted(() => {
    interval = setInterval(() => {
        now.value = new Date()
    }, 1000 * 60)// Automatic time update

    isCurrent.value.find((v, i) => {
        if (v) {
            rows.value[i].scrollIntoView()
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

function getFeedback(entry: any, index: number) {
    const feedback = cloud.offlineFeedback?.[p.day]?.[index]?.[settings.userIdentifier]
    if (!feedback) { return undefined }
    switch (entry.feedbackType as FeedbackType) {
    case 'basic':
        return feedback.basic
    case 'complicated':
        return feedback.complicated ? (feedback.complicated.reduce((prev, cur) => prev! + cur!, 0) ?? 0) / feedback.complicated.length : undefined
    }
    return undefined
}

async function deleteProgram(index: number, force = false) {
    (force || confirm('Opravdu chcete odsranit tento bod programu?\n(Stiskněte při kliknutí Ctrl pro přeskočení tohoto dialogu)')) && await setDoc(cloud.eventDoc('schedule', selectedDayId.value), {
        program: [
            ...selectedProgram.value.slice(0, index),
            ...selectedProgram.value.slice(index + 1),
        ],
    }, { merge: true })
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

</script>

<style lang="scss">
@import "@/assets/styles/constants.scss";

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
