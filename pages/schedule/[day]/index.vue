<template>
    <div>
        <EditableField description="Vedení dne:" :document="`schedule/${selectedDayId}`" property="manager" />
        <EditableField description="Vaření:" :document="`schedule/${selectedDayId}`" property="cooking" />
        <EditableField description="Nádobí:" :document="`schedule/${selectedDayId}`" property="dishes" class="mb-2" />

        <div role="list" class="schedule">
            <details
                v-for="(entry, index) in selectedProgram" :key="`e${index}`" role="listitem" :style="{
                    '--color': entry.color,
                    'border-left': parseInt((cloud.days[selectedDayIndex].date ?? '').split('-')?.[2]) == new Date().getDate() && nowFormatted > (entry.time ?? 0) && nowFormatted < (selectedProgram[index + 1]?.time ?? 0) ? '4px solid #0000ffaa' : undefined
                }">
                <summary>
                    <span class="align-top mr-1">
                        {{ toHumanTime(entry.time) }}
                    </span>
                    <div class="inline-block">
                        <h4>{{ entry.title }}</h4>
                        <h5 v-if="entry.subtitle">
                            {{ entry.subtitle }}
                        </h5>
                    </div>
                </summary>
                <NuxtLink :to="`/schedule/${selectedDayIndex}/${index}`" style="position: relative">
                    <Icon
                        v-if="!(entry.description?.match('<p|<br|<ol|<ul') ?? false)" class="icon"
                        :name="entry.icon ?? 'mdi:chevron-right'" />
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <span class="content" v-html="entry.description?.trim() || 'Žádné detaily'" />
                    <template v-if="cloud.user.auth?.uid && cloud.resolvedPermissions.editSchedule">
                        <button v-if="index > 0" class="edit" title="Posunout nahoru">
                            <Icon class="icon" name="mdi:arrow-up" @click.prevent="moveUp(entry, index)" />
                        </button>
                        <button v-if="index < selectedProgram.length - 1" class="edit" title="Posunout dolů">
                            <Icon class="icon" name="mdi:arrow-down" @click.prevent="moveDown(entry, index)" />
                        </button>
                        <NuxtLink :to="`/schedule/${selectedDayIndex}/edit/${index}`">
                            <button class="edit" title="Upravit">
                                <Icon class="icon" name="mdi:pencil" />
                            </button>
                        </NuxtLink>
                        <button class="edit" title="Smazat">
                            <Icon class="icon" name="mdi:trash-can" @click.prevent="deleteProgram(entry)" />
                        </button>
                    </template>
                    <span class="more">
                        <Icon class="icon" name="mdi:rss" />
                        <template v-if="!getFeedback(entry, index)">Feedback a detaily</template>
                        <NuxtRating
                            v-else :rating-value="(getFeedback(entry, index) as number)" rating-size="1.2rem"
                            inactive-color="#aaa" :title="`Tvé hodnocení: ${getFeedback(entry, index)}`" />
                    </span>
                </NuxtLink>
            </details>

            <NuxtLink v-if="cloud.resolvedPermissions.editSchedule" :to="`/schedule/${route.params.day}/edit`">
                <button>
                    <Icon name="mdi:pencil" />&nbsp;Přidat program
                </button>
            </NuxtLink>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { FeedbackType, ScheduleEvent } from '@/types/cloud'
import { useCloudStore } from '@/stores/cloud'
import { useSettings } from '@/stores/settings'
import { toHumanTime } from '@/utils/types'
import { setDoc } from '~/utils/trace'
import { arrayRemove } from 'firebase/firestore'

const route = useRoute()
const selectedDayIndex = computed(() => typeof route.params.day === 'string' ? parseInt(route.params.day) : 0)
const cloud = useCloudStore()
const selectedDayId = computed(() => cloud.days[selectedDayIndex.value]?.id)
const selectedProgram = computed(() => cloud.days ? cloud.days[selectedDayIndex.value]?.program : [])
const settings = useSettings()
const now = ref(new Date())

onMounted(() => {
    setInterval(() => {
        now.value = new Date()
    }, 1000 * 60)// Automatic time update
})
const nowFormatted = computed(() => now.value.getHours() * 100 + now.value.getMinutes())

function getFeedback(entry: any, index: number) {
    const feedback = cloud.offlineFeedback?.[selectedDayIndex.value]?.[index]?.[settings.userIdentifier]
    if (!feedback) { return undefined }
    switch (entry.feedbackType as FeedbackType) {
    case 'basic':
        return feedback.basic
    case 'complicated':
        return feedback.complicated ? (feedback.complicated.reduce((prev, cur) => prev! + cur!, 0) ?? 0) / feedback.complicated.length : undefined
    }
    return undefined
}

function deleteProgram(program: ScheduleEvent) {
    setDoc(cloud.eventDoc('schedule', selectedDayId.value), {
        program: arrayRemove(program),//TODO by index
    }, { merge: true })
}

function moveUp(program: ScheduleEvent, index: number) {
    const newProgram = selectedProgram.value
    newProgram.splice(index, 1)
    newProgram.splice(index - 1, 0, program)
    setDoc(cloud.eventDoc('schedule', selectedDayId.value), {
        program: newProgram,
    }, { merge: true })
}

function moveDown(program: ScheduleEvent, index: number) {
    const newProgram = selectedProgram.value
    newProgram.splice(index, 1)
    newProgram.splice(index + 1, 0, program)
    setDoc(cloud.eventDoc('schedule', selectedDayId.value), {
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

    .content,
    .more {
        margin: .5rem;

        &>p:first-child {
            margin-top: 1.7rem;
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
    position: absolute;
    right: 0;
    top: 0;
    display: flex;
    align-items: center;

    @media (hover: fine) {
        opacity: 0
    }
}
</style>
