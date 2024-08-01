import { defineStore } from 'pinia'

export const useRespondents = defineStore('respondents', function () {
    const names = ref(new Set())

    return {
        names,
    }
})
