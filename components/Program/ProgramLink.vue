<template>
    <details @click="click" @toggle="toggle">
        <summary class="flex">
            <span class="align-top mr-1">
                {{ toHumanTime(entry.time) }}
            </span>
            <div class="inline-block">
                <h4>
                    <Icon
                        v-if="settings.expandableItems && (entry.description?.trim() || entry.feedbackType)"
                        class="icon" :name="open ? 'mdi:chevron-down' : 'mdi:chevron-right'" />
                    {{ entry.title }}
                </h4>
                <h5 v-if="entry.subtitle">
                    {{ entry.subtitle }}
                </h5>
            </div>
            <div class="inline-block text-right" style="flex-grow: 1;">
                <span v-if="cloud.user.auth?.uid && cloud.resolvedPermissions.editSchedule" class="edit">
                    <button
                        v-if="index > 0" class="edit" title="Posunout nahoru"
                        @click.prevent="e('moveUp', entry, index)">
                        <Icon class="icon" name="mdi:arrow-up" />
                    </button>
                    <button
                        v-if="index < selectedProgram.length - 1" class="edit" title="Posunout dolů"
                        @click.prevent="e('moveDown', entry, index)">
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
                    <button
                        class="edit" title="Smazat" @click.prevent.exact="e('deleteProgram', index)"
                        @click.ctrl="e('deleteProgram', index, true)">
                        <Icon class="icon" name="mdi:trash-can" />
                    </button>
                    &ensp;
                </span>
                <div v-if="width >= 500" class="inline-block mr-2">
                    <NuxtRating
                        v-if="typeof feedback !== 'undefined' && !open" :rating-value="feedback"
                        rating-size="1.2rem" inactive-color="#aaa" :title="`Tvé hodnocení: ${feedback}`" tabindex="0" />
                </div>
                <Icon v-if="entry.icon" :name="entry.icon" />
            </div>
        </summary>
        <NuxtLink
            :to="{
                name: 'schedule-day-event',
                params: {
                    day: p.day.toString(),
                    event: p.index.toString(),
                },
                query: $route.query,
            }" style="position: relative">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="content" v-html="entry.description?.trim() || '<p>Žádné detaily</p>'" />
            <span class="more">
                <Icon
                    v-if="!empty || entry.feedbackType" class="icon"
                    :name="entry.feedbackType ? 'mdi:rss' : 'mdi:script'" />
                <template v-if="!feedback">{{ entry.feedbackType ? `Feedback ${empty ? 'dostupný' :
                    'a detaily'}` :
                    empty ? '' : 'Detail' }}</template>
                <NuxtRating
                    v-else-if="typeof feedback !== 'undefined'" :rating-value="feedback" rating-size="1.2rem"
                    inactive-color="#aaa" :title="`Tvé hodnocení: ${feedback}`" tabindex="0" />
            </span>
        </NuxtLink>
    </details>
</template>

<script lang="ts" setup>
// TODO: detailní feedback
import type { FeedbackType, ScheduleItem } from '@/types/cloud'
import { toHumanTime } from '@/utils/types'

const e = defineEmits<{
    moveUp: [entry: ScheduleItem, index: number],
    moveDown: [entry: ScheduleItem, index: number],
    deleteProgram: [index: number, confirm?: boolean],
}>()

const p = defineProps<{
    day: number,
    index: number,
    entry: ScheduleItem,
}>()

const open = ref(false)

const cloud = useCloudStore()
const admin = useAdmin()
const settings = useSettings()
const empty = computed(() => !(p.entry.description?.match('<p|<br|<ol|<ul') ?? false))
const selectedProgram = computed(() => cloud.days?.[p.day]?.program || [])
const router = useRouter()
const width = ref(0)
const handler = () => { width.value = window.innerWidth }
onMounted(() => {
    width.value = window.innerWidth
    window.addEventListener('resize', handler)
})
onUnmounted(() => {
    window.removeEventListener('resize', handler)
})

const feedback = computed(() => {
    const feedback = cloud.offlineFeedback?.[p.day]?.[p.index]?.[settings.userIdentifier]
    if (!feedback) { return undefined }
    switch (p.entry.feedbackType as FeedbackType) {
    case 'basic':
        return feedback.basic
    case 'complicated':
        return feedback.complicated ? (feedback.complicated.reduce((prev, cur) => prev! + cur!, 0) ?? 0) / feedback.complicated.length : undefined
    }
    return undefined
})

const inMotion = inject<Ref<boolean>>('inMotion')

function click(e: Event) {
    if (!settings.expandableItems) {
        e.preventDefault()
        if (!(inMotion?.value ?? false)) {
            router.push({
                name: 'schedule-day-event',
                params: {
                    day: p.day.toString(),
                    event: p.index.toString(),
                },
                query: router.currentRoute.value.query,
            })
        }
    }
}

function toggle(e: Event) {
    open.value = (e.target as HTMLDetailsElement).open
}
</script>