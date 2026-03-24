import { defineStore } from 'pinia'

export const useFeedbackRespondents = defineStore('feedbackRespondents', function () {
    const names = ref(new Set<string>())

    return {
        names,
    }
})
