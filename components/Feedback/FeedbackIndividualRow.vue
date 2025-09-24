<template>
    <td v-for="(reply, rIndex) in replies" :key="`r${rIndex}`">
        <div>
            <template v-if="reply">
                <FeedbackReply
                    :reply="reply"
                    :questions="questions"
                    :respondent="respondents[rIndex]"
                    @set-data="props.onSetData"
                />
                <button
                    v-show="admin.editingFeedback.value"
                    @click.exact="confirm('Opravdu chcete smazat tuto odpověď?\n(Zmáčkněte při kliknutí Ctrl pro přeskočení tohoto dialogu)') && del(rIndex)"
                    @click.ctrl="del(rIndex)"
                >
                    <Icon name="mdi:trash" />
                </button>
            </template>
        </div>
    </td>
</template>

<script setup lang="ts">
import type { Feedback, UpdatePayload } from '@/types/cloud'
import { useAdmin } from '@/stores/admin'

const props = defineProps<{
    onSetData?:(data: UpdatePayload<Feedback> | null, userIdentifier: string) => void,
    replies: (Feedback | null)[],
    respondents: string[]
    questions?: string[],
}>()

function confirm(message: string) {
    return window.confirm(message)
}

function del(index: number) {
    props.onSetData!(null, props.respondents[index])
}

const admin = storeToRefs(useAdmin())


</script>
