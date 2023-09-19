<template>
    <td v-for="(reply, rIndex) in replies" :key="`r${rIndex}`">
        <div>
            <template v-if="reply">
                <FeedbackReply
                    :reply="reply"
                    :questions="questions"
                    :respondent="respondents[rIndex]"
                    @set-data="$props.onSetData"
                />
                <button
                    v-show="admin.editingFeedback"
                    @click="$props.onSetData!(null, respondents[rIndex])"
                >
                    <IconCSS name="mdi:trash" />
                </button>
            </template>
        </div>
    </td>
</template>

<script setup lang="ts">
import { Feedback } from '@/types/cloud'
import { useAdmin } from '@/stores/admin'

defineProps<{
    onSetData?:(data: Feedback | null, userIdentifier: string) => void,
    replies: Feedback[],
    respondents: string[]
    questions?: string[],
}>()

const admin = useAdmin()


</script>
